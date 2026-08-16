// Pure, side-effect-free live-draft math — same spirit as tournament-logic.ts.
// "Whose turn is it" is deliberately never stored; it's recomputed from the
// actual roster every time a pick is checked or the board is rendered, so
// it can't drift out of sync with reality the way a separate turn pointer
// could (a failed request, a retried pick, an admin manual fix — none of
// those can leave the turn indicator lying about who's on the clock).

export interface DraftTeam {
  id: string;
  order: number; // 0 or 1 — see Team.order in schema.prisma
}

export interface DraftPlayer {
  id: string;
  tier: number;
}

export interface DraftState {
  /** 1-4, or null once every tier is full for both teams. */
  currentTier: number | null;
  /** Team id whose pick it is, or null once the draft is complete. */
  onTheClockTeamId: string | null;
  /** How many players each team drafts from every tier — round.playersStart / 8. */
  picksPerTeamPerTier: number;
  isComplete: boolean;
}

/** Which side drafts first in a given tier — alternates by tier so each
 * team gets the first pick of a tier equally often across all four. */
function startingTeamForTier(teams: [DraftTeam, DraftTeam], tier: number): DraftTeam {
  const startingOrder = tier % 2 === 1 ? 0 : 1;
  return teams.find((t) => t.order === startingOrder) ?? teams[0];
}

/**
 * Figures out the current state of a round's live draft from its actual
 * roster (`rosterPlayerIds` per team) against the pool of players eligible
 * for the round. `playersStart` drives how many picks each team gets per
 * tier (32 -> 4, 16 -> 2, 8 -> 1 — see the Draft Rules on /rules).
 */
export function computeDraftState(
  teams: [DraftTeam, DraftTeam],
  rosterPlayerIdsByTeam: Record<string, string[]>,
  eligiblePlayers: DraftPlayer[],
  playersStart: number,
): DraftState {
  const picksPerTeamPerTier = playersStart / 8;
  const tierOfPlayer = new Map(eligiblePlayers.map((p) => [p.id, p.tier]));

  const countInTier = (teamId: string, tier: number) =>
    (rosterPlayerIdsByTeam[teamId] ?? []).filter((id) => tierOfPlayer.get(id) === tier).length;

  for (let tier = 1; tier <= 4; tier++) {
    const [teamX, teamY] = teams;
    const xCount = countInTier(teamX.id, tier);
    const yCount = countInTier(teamY.id, tier);
    if (xCount >= picksPerTeamPerTier && yCount >= picksPerTeamPerTier) continue;

    const starting = startingTeamForTier(teams, tier);
    const other = starting.id === teamX.id ? teamY : teamX;
    const startingCount = starting.id === teamX.id ? xCount : yCount;
    const otherCount = other.id === teamX.id ? xCount : yCount;

    const onTheClock = startingCount <= otherCount ? starting : other;
    return { currentTier: tier, onTheClockTeamId: onTheClock.id, picksPerTeamPerTier, isComplete: false };
  }

  return { currentTier: null, onTheClockTeamId: null, picksPerTeamPerTier, isComplete: true };
}

/** The undrafted pool for whichever tier is currently on the clock. */
export function undraftedPlayersInTier(
  eligiblePlayers: DraftPlayer[],
  draftedPlayerIds: Set<string>,
  tier: number,
): DraftPlayer[] {
  return eligiblePlayers.filter((p) => p.tier === tier && !draftedPlayerIds.has(p.id));
}
