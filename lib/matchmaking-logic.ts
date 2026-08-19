// Pure, side-effect-free math for the two captain-driven phases that sit
// between a round's draft and its matches — same spirit as draft-logic.ts.
//
// Phase 1, twosome locking: both captains privately split their own roster
// into 2-man pairs, entirely independently of each other — there's no
// "turn" here, just "is my team done yet."
//
// Phase 2, live matchmaking: captains alternate announcing a locked twosome
// and answering the other captain's announcement, per the site's published
// rules ("Team A announces one of its locked twosomes. Team B chooses one
// of its own locked twosomes to play against it. Team B then announces a
// different locked twosome. Team A chooses one of its remaining
// twosomes...", see /rules). Unlike the draft's "whose turn," a pending
// announcement is a specific item awaiting a response, not just a count —
// so it needs a real flag (Pairing.announced) rather than being fully
// re-derivable from the roster alone.

export interface TwosomeLockTeamState {
  teamId: string;
  requiredPairings: number;
  lockedCount: number;
  isComplete: boolean;
}

export interface TwosomeLockState {
  teams: [TwosomeLockTeamState, TwosomeLockTeamState];
  isComplete: boolean;
}

/** How many twosomes a team building `requiredPairings` from `rosterSize`
 * players still needs, per team. `pairingCountByTeam` counts only locked
 * pairings — an unlocked one (rare; see lockTwosomeLogic) doesn't count
 * toward completeness. */
export function computeTwosomeLockState(
  teams: [{ id: string }, { id: string }],
  rosterSizePerTeam: number,
  lockedPairingCountByTeam: Record<string, number>,
): TwosomeLockState {
  const requiredPairings = rosterSizePerTeam / 2;
  const teamStates = teams.map((t): TwosomeLockTeamState => {
    const lockedCount = lockedPairingCountByTeam[t.id] ?? 0;
    return { teamId: t.id, requiredPairings, lockedCount, isComplete: lockedCount >= requiredPairings };
  }) as [TwosomeLockTeamState, TwosomeLockTeamState];

  return { teams: teamStates, isComplete: teamStates.every((t) => t.isComplete) };
}

export type MatchmakingPhase = "ANNOUNCE" | "RESPOND";

export interface MatchmakingTeam {
  id: string;
  order: number; // 0 or 1, see Team.order
}

export interface UnmatchedPairing {
  id: string;
  teamId: string;
  announced: boolean;
}

export interface MatchmakingState {
  phase: MatchmakingPhase | null; // null once every twosome has an opponent
  onTheClockTeamId: string | null;
  announcedPairingId: string | null;
  isComplete: boolean;
}

/** Figures out the live matchmaking state from the round's actual
 * still-unmatched pairings and how many matches have been built so far —
 * the announcer alternates by match count the same way draft turns
 * alternate by pick count, and self-corrects the same way too (a team out
 * of twosomes is skipped rather than leaving nobody able to announce). */
export function computeMatchmakingState(
  teams: [MatchmakingTeam, MatchmakingTeam],
  unmatchedPairings: UnmatchedPairing[],
  matchesBuiltCount: number,
): MatchmakingState {
  if (unmatchedPairings.length === 0) {
    return { phase: null, onTheClockTeamId: null, announcedPairingId: null, isComplete: true };
  }

  const announced = unmatchedPairings.find((p) => p.announced) ?? null;
  if (announced) {
    const responder = teams.find((t) => t.id !== announced.teamId) ?? teams[0];
    return { phase: "RESPOND", onTheClockTeamId: responder.id, announcedPairingId: announced.id, isComplete: false };
  }

  const [teamX, teamY] = teams;
  const preferred = matchesBuiltCount % 2 === 0 ? teamX : teamY;
  const preferredHasPairings = unmatchedPairings.some((p) => p.teamId === preferred.id);
  const announcer = preferredHasPairings ? preferred : (teams.find((t) => t.id !== preferred.id) ?? preferred);

  return { phase: "ANNOUNCE", onTheClockTeamId: announcer.id, announcedPairingId: null, isComplete: false };
}
