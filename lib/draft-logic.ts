// Pure, side-effect-free live-draft math — same spirit as tournament-logic.ts.
// "Whose turn is it" is deliberately never stored; it's recomputed from the
// actual roster every time a pick is checked or the board is rendered, so
// it can't drift out of sync with reality the way a separate turn pointer
// could (a failed request, a retried pick, an admin manual fix — none of
// those can leave the turn indicator lying about who's on the clock).
//
// Picks are NOT locked to a single "current tier" in order — a captain can
// take any undrafted player from any tier that their own team hasn't
// already filled, on their turn. Tiers still cap how many of each a team
// can end up with (so rosters stay balanced by the final pick), but the
// *order* players get taken in is entirely up to the captains — e.g. a
// tier-4 player who stood out in Round 1 can be drafted before a team has
// finished taking its tier-1 players.

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
  /** How many players each team drafts from every tier — round.playersStart / 8. */
  picksPerTeamPerTier: number;
  isComplete: boolean;
}

/** How many more players the given roster still needs from each tier
 * (1-4), capped at zero once a tier is full. Used both to validate a pick
 * server-side and to tell the UI which tiers are still open for whoever's
 * on the clock. */
export function remainingCapacityByTier(
  rosterPlayerIds: string[],
  eligiblePlayers: DraftPlayer[],
  picksPerTeamPerTier: number,
): Record<number, number> {
  const tierOfPlayer = new Map(eligiblePlayers.map((p) => [p.id, p.tier]));
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const id of rosterPlayerIds) {
    const tier = tierOfPlayer.get(id);
    if (tier) counts[tier] = (counts[tier] ?? 0) + 1;
  }
  const remaining: Record<number, number> = {};
  for (let tier = 1; tier <= 4; tier++) {
    remaining[tier] = Math.max(0, picksPerTeamPerTier - (counts[tier] ?? 0));
  }
  return remaining;
}

/**
 * Figures out the current state of a round's live draft from its actual
 * roster (`rosterPlayerIds` per team) against the pool of players eligible
 * for the round. `playersStart` drives how many picks each team gets per
 * tier (32 -> 4, 16 -> 2, 8 -> 1 — see the Draft Rules on /rules), which
 * caps each team's roster but no longer dictates draft order.
 */
export function computeDraftState(
  teams: [DraftTeam, DraftTeam],
  rosterPlayerIdsByTeam: Record<string, string[]>,
  eligiblePlayers: DraftPlayer[],
  playersStart: number,
): DraftState {
  const picksPerTeamPerTier = playersStart / 8;
  const totalPicksPerTeam = picksPerTeamPerTier * 4;
  const [teamX, teamY] = teams;
  const xMade = (rosterPlayerIdsByTeam[teamX.id] ?? []).length;
  const yMade = (rosterPlayerIdsByTeam[teamY.id] ?? []).length;

  if (xMade >= totalPicksPerTeam && yMade >= totalPicksPerTeam) {
    return { onTheClockTeamId: null, picksPerTeamPerTier, isComplete: true };
  }

  // Whichever team has made fewer picks goes next (a tie favors the
  // order-0 team); a team that's already filled its roster is skipped
  // even if the raw counts would otherwise point back to it. In the
  // normal case (no manual overrides) this produces the same strict
  // A, B, A, B, ... alternation as before, just without tier phases.
  const xEligible = xMade < totalPicksPerTeam;
  const yEligible = yMade < totalPicksPerTeam;
  const onTheClock = xEligible && (!yEligible || xMade <= yMade) ? teamX : teamY;

  return { onTheClockTeamId: onTheClock.id, picksPerTeamPerTier, isComplete: false };
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
