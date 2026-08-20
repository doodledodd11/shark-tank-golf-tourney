// Pure, side-effect-free live-draft math — same spirit as tournament-logic.ts.
// "Whose turn is it" is deliberately never stored; it's recomputed from the
// actual roster every time a pick is checked or the board is rendered, so
// it can't drift out of sync with reality the way a separate turn pointer
// could (a failed request, a retried pick, an admin manual fix — none of
// those can leave the turn indicator lying about who's on the clock).
//
// Picks are NOT locked to a single "current tier" in order, and tiers are
// NOT a hard cap either — a captain can take any undrafted player from any
// tier at any point on their turn, even one their team has already taken
// plenty from. Tier counts are shown to captains purely as a recommended
// target for a balanced roster; nothing server-side enforces them. Only the
// total roster size per team is a real constraint.

export interface DraftTeam {
  id: string;
  order: number; // 0 or 1 — see Team.order in schema.prisma
}

export interface DraftPlayer {
  id: string;
  tier: number;
}

export interface DraftState {
  /** Team id whose pick it is, or null once the draft is complete. */
  onTheClockTeamId: string | null;
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
 * Snake-draft position: index 0 (the very first real pick, after both
 * captains are auto-seated as pick zero — see startDraftLogic) goes to the
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

/**
 * Figures out the current state of a round's live draft from its actual
 * roster (`rosterPlayerIds` per team) against the pool of players eligible
 * for the round. `playersStart` drives each team's total roster size and
 * the recommended per-tier target (32 -> 4, 16 -> 2, 8 -> 1 — see the Draft
 * Rules on /rules); the total is a real constraint, the per-tier split is
 * advisory only.
 */
export function computeDraftState(
  teams: [DraftTeam, DraftTeam],
  rosterPlayerIdsByTeam: Record<string, string[]>,
  eligiblePlayers: DraftPlayer[],
  playersStart: number,
): DraftState {
  const recommendedPicksPerTier = playersStart / 8;
  const totalPicksPerTeam = recommendedPicksPerTier * 4;
  const [teamX, teamY] = teams;
  const xMade = (rosterPlayerIdsByTeam[teamX.id] ?? []).length;
  const yMade = (rosterPlayerIdsByTeam[teamY.id] ?? []).length;

  if (xMade >= totalPicksPerTeam && yMade >= totalPicksPerTeam) {
    return { onTheClockTeamId: null, recommendedPicksPerTier, isComplete: true };
  }

  // Both captains are seated as their team's pick zero before any real
  // picking happens, so the snake sequence only covers what's made since —
  // xMade/yMade each start at 1, hence the -1s below. Driven off the total
  // rather than either team's own count since the snake schedule isn't
  // "whoever's behind goes next" — a team can legitimately be two picks
  // ahead mid-sequence and still be correct.
  const picksIntoSequence = xMade - 1 + (yMade - 1);
  let onTheClock = snakeTeamAtIndex(picksIntoSequence, teamX, teamY);
  // A team that's already filled its roster is skipped even if the
  // schedule would otherwise point back to it (shouldn't happen from
  // normal captain-driven play, but keeps this correct if a roster ever
  // gets out of step with the schedule, e.g. a manual admin edit).
  if (onTheClock.id === teamX.id && xMade >= totalPicksPerTeam) onTheClock = teamY;
  else if (onTheClock.id === teamY.id && yMade >= totalPicksPerTeam) onTheClock = teamX;

  return { onTheClockTeamId: onTheClock.id, recommendedPicksPerTier, isComplete: false };
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
