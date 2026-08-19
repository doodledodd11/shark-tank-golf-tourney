import { describe, expect, it } from "vitest";
import {
  computeTwosomeLockState,
  computeMatchmakingState,
  type MatchmakingTeam,
  type UnmatchedPairing,
} from "@/lib/matchmaking-logic";

const teamA = { id: "teamA" };
const teamB = { id: "teamB" };
const teams: [{ id: string }, { id: string }] = [teamA, teamB];

describe("computeTwosomeLockState", () => {
  it("requires half the roster size in pairings per team", () => {
    const state = computeTwosomeLockState(teams, 16, {});
    expect(state.teams[0]).toEqual({ teamId: "teamA", requiredPairings: 8, lockedCount: 0, isComplete: false });
    expect(state.isComplete).toBe(false);
  });

  it("marks a team complete once it has enough locked pairings", () => {
    const state = computeTwosomeLockState(teams, 16, { teamA: 8, teamB: 3 });
    expect(state.teams[0].isComplete).toBe(true);
    expect(state.teams[1].isComplete).toBe(false);
    expect(state.isComplete).toBe(false);
  });

  it("is complete only once both teams have hit their target", () => {
    const state = computeTwosomeLockState(teams, 16, { teamA: 8, teamB: 8 });
    expect(state.isComplete).toBe(true);
  });

  it("scales the requirement down for a smaller round (Round 2: 8 players -> 4 pairings)", () => {
    const state = computeTwosomeLockState(teams, 8, {});
    expect(state.teams[0].requiredPairings).toBe(4);
  });
});

const mmTeams: [MatchmakingTeam, MatchmakingTeam] = [
  { id: "teamA", order: 0 },
  { id: "teamB", order: 1 },
];

function pairing(id: string, teamId: string, announced = false): UnmatchedPairing {
  return { id, teamId, announced };
}

describe("computeMatchmakingState", () => {
  it("reports complete once no unmatched pairings remain", () => {
    const state = computeMatchmakingState(mmTeams, [], 8);
    expect(state).toEqual({ phase: null, onTheClockTeamId: null, announcedPairingId: null, isComplete: true });
  });

  it("opens with Team A (order 0) announcing when nothing's been announced yet", () => {
    const pairings = [pairing("a1", "teamA"), pairing("b1", "teamB")];
    const state = computeMatchmakingState(mmTeams, pairings, 0);
    expect(state).toEqual({ phase: "ANNOUNCE", onTheClockTeamId: "teamA", announcedPairingId: null, isComplete: false });
  });

  it("alternates the announcer by how many matches have been built (A, B, A, B, ...)", () => {
    const pairings = [pairing("a1", "teamA"), pairing("b1", "teamB")];
    expect(computeMatchmakingState(mmTeams, pairings, 1).onTheClockTeamId).toBe("teamB");
    expect(computeMatchmakingState(mmTeams, pairings, 2).onTheClockTeamId).toBe("teamA");
    expect(computeMatchmakingState(mmTeams, pairings, 3).onTheClockTeamId).toBe("teamB");
  });

  it("puts the OTHER team on the clock to respond once a pairing is announced", () => {
    const pairings = [pairing("a1", "teamA", true), pairing("b1", "teamB")];
    const state = computeMatchmakingState(mmTeams, pairings, 0);
    expect(state).toEqual({ phase: "RESPOND", onTheClockTeamId: "teamB", announcedPairingId: "a1", isComplete: false });
  });

  it("has the announcing team's own remaining pairings excluded from who can respond", () => {
    // Team B announced one of its own — Team A must be the responder, even
    // though the match count alone would suggest Team B is "due" to announce.
    const pairings = [pairing("a1", "teamA"), pairing("b1", "teamB", true)];
    const state = computeMatchmakingState(mmTeams, pairings, 1);
    expect(state.onTheClockTeamId).toBe("teamA");
    expect(state.phase).toBe("RESPOND");
  });

  it("skips a team with no remaining pairings rather than stalling", () => {
    // Team A is "due" to announce (even match count) but has nothing left.
    const pairings = [pairing("b1", "teamB")];
    const state = computeMatchmakingState(mmTeams, pairings, 2);
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.phase).toBe("ANNOUNCE");
  });
});
