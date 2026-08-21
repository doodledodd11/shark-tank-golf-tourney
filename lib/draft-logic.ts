// Pure, side-effect-free live-draft math — same spirit as tournament-logic.ts.
// "Whose turn is it" is deliberately never stored; it's recomputed from the
// actual roster every time a pick is checked or the board is rendered, so
// it can't drift out of sync with reality the way a separate turn pointer
// could (a failed request, a retried pick, an admin manual fix — none of
// those can leave the turn indicator lying about who's on the clock).
//
// The draft runs as a snake, and every *second* pick in that snake ("the
// mirror pick" — see isMirrorPickIndex) is tier-locked to whatever tier the
// pick right before it came from; every other pick is free (any tier, no
// cap). That's the one real constraint — a captain can still take as many
// players from a tier as they want on a free pick, tier counts shown
// elsewhere are still just a recommended balance target.

export interface DraftTeam {
  id: string;
  order: number; // 0 or 1 — see Team.order in schema.prisma
}

export interface DraftPlayer {
  id: string;
  tier: number;
}

/** One real pick, in the order it happened. Auto-seated captains (and any
 * auto-assigned cross-tier partner — see startDraftLogic) are NOT picks for
 * this purpose; only what a captain actually chose counts toward the snake
 * sequence and the tier-mirror rule. */
export interface DraftPickRecord {
  tier: number;
}

export interface DraftState {
  /** Team id whose pick it is, or null once the draft is complete. */
  onTheClockTeamId: string | null;
  /** The tier the next pick must come from, or null if it's free (either
   * because it's not a mirror-pick slot, or the mirrored tier has already
   * run out of eligible players — see computeDraftState). */
  requiredTier: number | null;
  /** Recommended (not enforced) players per tier for a balanced roster — round.playersStart / 8. */
  recommendedPicksPerTier: number;
  isComplete: boolean;
}

/** How many more players the given roster would need from each tier (1-4)
 * to hit the recommended balanced target, floored at zero once a tier's
 * target is met. Purely advisory — nothing stops a captain from picking
 * from a tier that's already at or past this. Used only to render the
 * "recommended" hint in the draft UI. */
export function recommendedRemainingByTier(
  rosterPlayerIds: string[],
  eligiblePlayers: DraftPlayer[],
  recommendedPicksPerTier: number,
): Record<number, number> {
  const tierOfPlayer = new Map(eligiblePlayers.map((p) => [p.id, p.tier]));
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const id of rosterPlayerIds) {
    const tier = tierOfPlayer.get(id);
    if (tier) counts[tier] = (counts[tier] ?? 0) + 1;
  }
  const remaining: Record<number, number> = {};
  for (let tier = 1; tier <= 4; tier++) {
    remaining[tier] = Math.max(0, recommendedPicksPerTier - (counts[tier] ?? 0));
  }
  return remaining;
}

/**
 * Snake-draft position: index 0 (the very first real pick) goes to the
 * order-0 team; from then on, picks come in pairs — index 1-2 to the
 * order-1 team, 3-4 back to order-0, 5-6 to order-1, and so on. That gives
 * whoever picks second a two-pick "makeup" right after whoever picked
 * first, which is the standard fantasy-sports snake (serpentine) draft —
 * for exactly two teams it reduces to this 1-2-2-2-2... pattern.
 */
function snakeTeamAtIndex(index: number, teamX: DraftTeam, teamY: DraftTeam): DraftTeam {
  if (index <= 0) return teamX;
  const block = Math.floor((index - 1) / 2);
  return block % 2 === 0 ? teamY : teamX;
}

/** Every *odd* pick index is a "mirror" of the pick right before it — pick 0
 * is free, pick 1 mirrors pick 0's tier, pick 2 is free again (a new
 * exchange), pick 3 mirrors pick 2's tier, and so on. This is independent
 * of snakeTeamAtIndex's team-pairing (which groups picks differently, by
 * who's on the clock) — a mirror pick and its leader are always made by
 * different teams, since consecutive same-team picks in the snake only
 * happen at even/odd-straddling boundaries. */
function isMirrorPickIndex(index: number): boolean {
  return index > 0 && index % 2 === 1;
}

/**
 * Figures out the current state of a round's live draft from its actual
 * roster (`rosterPlayerIds` per team) against the pool of players eligible
 * for the round, plus the chronological list of real picks made so far
 * (`picksInOrder` — excludes auto-seated captains/partners; see
 * DraftPickRecord). `playersStart` drives each team's total roster size and
 * the recommended per-tier target (32 -> 4, 16 -> 2, 8 -> 1 — see the Draft
 * Rules on /rules); the total is a real constraint, the per-tier split is
 * only enforced on mirror picks (see requiredTier).
 */
export function computeDraftState(
  teams: [DraftTeam, DraftTeam],
  rosterPlayerIdsByTeam: Record<string, string[]>,
  picksInOrder: DraftPickRecord[],
  eligiblePlayers: DraftPlayer[],
  playersStart: number,
): DraftState {
  const recommendedPicksPerTier = playersStart / 8;
  const totalPicksPerTeam = recommendedPicksPerTier * 4;
  const [teamX, teamY] = teams;
  const xMade = (rosterPlayerIdsByTeam[teamX.id] ?? []).length;
  const yMade = (rosterPlayerIdsByTeam[teamY.id] ?? []).length;

  if (xMade >= totalPicksPerTeam && yMade >= totalPicksPerTeam) {
    return { onTheClockTeamId: null, requiredTier: null, recommendedPicksPerTier, isComplete: true };
  }

  // Driven off how many real picks have happened, not raw roster size —
  // robust to a team starting with either 1 (captain only) or 2 (captain +
  // auto-assigned cross-tier partner) auto-seated members, since those
  // never appear in picksInOrder either way.
  const index = picksInOrder.length;
  let onTheClock = snakeTeamAtIndex(index, teamX, teamY);
  // A team that's already filled its roster is skipped even if the
  // schedule would otherwise point back to it (shouldn't happen from
  // normal captain-driven play, but keeps this correct if a roster ever
  // gets out of step with the schedule, e.g. a manual admin edit).
  if (onTheClock.id === teamX.id && xMade >= totalPicksPerTeam) onTheClock = teamY;
  else if (onTheClock.id === teamY.id && yMade >= totalPicksPerTeam) onTheClock = teamX;

  let requiredTier: number | null = null;
  if (isMirrorPickIndex(index)) {
    const mirroredTier = picksInOrder[index - 1]?.tier ?? null;
    if (mirroredTier != null) {
      // If the mirrored tier has already run dry, don't deadlock the
      // draft over it — fall back to a free pick instead.
      const draftedIds = new Set([...(rosterPlayerIdsByTeam[teamX.id] ?? []), ...(rosterPlayerIdsByTeam[teamY.id] ?? [])]);
      const tierStillOpen = eligiblePlayers.some((p) => p.tier === mirroredTier && !draftedIds.has(p.id));
      if (tierStillOpen) requiredTier = mirroredTier;
    }
  }

  return { onTheClockTeamId: onTheClock.id, requiredTier, recommendedPicksPerTier, isComplete: false };
}

/** The undrafted pool for one specific tier (a team may have several tiers
 * open to pick from at once now, so callers loop this per open tier
 * rather than asking for a single "current" tier's pool). */
export function undraftedPlayersInTier(
  eligiblePlayers: DraftPlayer[],
  draftedPlayerIds: Set<string>,
  tier: number,
): DraftPlayer[] {
  return eligiblePlayers.filter((p) => p.tier === tier && !draftedPlayerIds.has(p.id));
}

/** Which captain drafts first, per the "worse seed picks first" rule —
 * tier trumps intra-tier seed (a tier-4 captain is always "worse" than a
 * tier-1 captain, regardless of seed). A missing seed is treated as worse
 * than any actual seed in the same tier, since there's no better default
 * than "assume unseeded until told otherwise." Ties (identical tier and
 * seed, or both missing seeds in the same tier) default to `a`, so this is
 * always a well-defined total order. */
export function worseSeededCaptain(
  a: { tier: number; seed: number | null },
  b: { tier: number; seed: number | null },
): "a" | "b" {
  if (a.tier !== b.tier) return a.tier > b.tier ? "a" : "b";
  if (a.seed != null && b.seed != null && a.seed !== b.seed) return a.seed > b.seed ? "a" : "b";
  if (a.seed == null && b.seed != null) return "a";
  if (a.seed != null && b.seed == null) return "b";
  return "a";
}
