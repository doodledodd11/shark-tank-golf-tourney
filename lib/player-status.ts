import type { Player } from "@prisma/client";
import type { RoundWithDetails, TeamWithRoster } from "@/lib/data";

export interface CurrentAssignment {
  round: RoundWithDetails;
  team: TeamWithRoster;
  isCaptain: boolean;
  partner: Player | null;
}

/**
 * Where a player currently stands: their most recent round's team, whether
 * they captained it, and their locked pairing partner (if any). Looks from
 * the highest round number down, since a player only has a membership in
 * rounds they were actually drafted into.
 */
export function getCurrentAssignment(rounds: RoundWithDetails[], playerId: string): CurrentAssignment | null {
  const sorted = [...rounds].sort((a, b) => b.number - a.number);
  for (const round of sorted) {
    for (const team of round.teams) {
      const membership = team.memberships.find((m) => m.playerId === playerId);
      if (!membership) continue;
      const pairing = round.pairings.find((p) => p.player1Id === playerId || p.player2Id === playerId);
      const partner = pairing ? (pairing.player1Id === playerId ? pairing.player2 : pairing.player1) : null;
      return { round, team, isCaptain: team.captainId === playerId, partner };
    }
  }
  return null;
}

/**
 * Players eligible to be drafted onto this round's teams: anyone not
 * eliminated in an earlier round and not already crowned champion, plus —
 * critically — anyone already on this round's roster, so re-editing a
 * round's teams later doesn't drop players who were since eliminated by a
 * *later* round from view.
 */
export function getEligiblePlayersForRound(round: RoundWithDetails, allPlayers: Player[]): Player[] {
  const currentRosterIds = new Set(round.teams.flatMap((t) => t.memberships.map((m) => m.playerId)));
  return allPlayers.filter((p) => {
    if (currentRosterIds.has(p.id)) return true;
    if (p.status === "CHAMPION") return false;
    if (p.status === "ELIMINATED" && (p.eliminatedRound == null || p.eliminatedRound < round.number)) return false;
    return true;
  });
}

/** Builds a playerId -> CurrentAssignment lookup for a whole field at once. */
export function buildAssignmentMap(
  rounds: RoundWithDetails[],
  players: Player[],
): Map<string, CurrentAssignment | null> {
  const map = new Map<string, CurrentAssignment | null>();
  for (const player of players) {
    map.set(player.id, getCurrentAssignment(rounds, player.id));
  }
  return map;
}
