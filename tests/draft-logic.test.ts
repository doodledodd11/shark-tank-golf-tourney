import { describe, expect, it } from "vitest";
import { computeDraftState, undraftedPlayersInTier, type DraftPlayer, type DraftTeam } from "@/lib/draft-logic";

const teamA: DraftTeam = { id: "teamA", order: 0 };
const teamB: DraftTeam = { id: "teamB", order: 1 };
const teams: [DraftTeam, DraftTeam] = [teamA, teamB];

function tierPlayers(tier: number, count: number, prefix: string): DraftPlayer[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}`, tier }));
}

// A believable Round 1 pool: 8 players per tier, 32 total.
const round1Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 8, `t${tier}-`));

describe("computeDraftState", () => {
  it("opens a fresh Round 1 draft on tier 1, order-0 team on the clock", () => {
    const state = computeDraftState(teams, {}, round1Pool, 32);
    expect(state).toEqual({ currentTier: 1, onTheClockTeamId: "teamA", picksPerTeamPerTier: 4, isComplete: false });
  });

  it("alternates strictly within a tier (A, B, A, B, ...)", () => {
    const picks: string[] = [];
    const roster: Record<string, string[]> = { teamA: [], teamB: [] };

    for (let i = 0; i < 8; i++) {
      const state = computeDraftState(teams, roster, round1Pool, 32);
      expect(state.isComplete).toBe(false);
      expect(state.currentTier).toBe(1);
      picks.push(state.onTheClockTeamId!);
      // Draft whichever tier-1 player hasn't been taken yet.
      const taken = new Set([...roster.teamA!, ...roster.teamB!]);
      const next = round1Pool.find((p) => p.tier === 1 && !taken.has(p.id))!;
      roster[state.onTheClockTeamId!]!.push(next.id);
    }

    expect(picks).toEqual(["teamA", "teamB", "teamA", "teamB", "teamA", "teamB", "teamA", "teamB"]);
    expect(roster.teamA).toHaveLength(4);
    expect(roster.teamB).toHaveLength(4);
  });

  it("moves to tier 2 once tier 1 is full for both teams, and tier 2 starts with the order-1 team", () => {
    const tier1Ids = round1Pool.filter((p) => p.tier === 1).map((p) => p.id);
    const roster = { teamA: tier1Ids.slice(0, 4), teamB: tier1Ids.slice(4, 8) };

    const state = computeDraftState(teams, roster, round1Pool, 32);
    expect(state).toEqual({ currentTier: 2, onTheClockTeamId: "teamB", picksPerTeamPerTier: 4, isComplete: false });
  });

  it("reports the draft complete once every tier is full for both teams", () => {
    const roster: Record<string, string[]> = { teamA: [], teamB: [] };
    for (const tier of [1, 2, 3, 4]) {
      const ids = round1Pool.filter((p) => p.tier === tier).map((p) => p.id);
      roster.teamA!.push(...ids.slice(0, 4));
      roster.teamB!.push(...ids.slice(4, 8));
    }
    const state = computeDraftState(teams, roster, round1Pool, 32);
    expect(state).toEqual({ currentTier: null, onTheClockTeamId: null, picksPerTeamPerTier: 4, isComplete: true });
  });

  it("self-corrects toward balance if a tier gets manually thrown out of sync", () => {
    // Team A has 2 tier-1 picks, Team B has 0 — e.g. after an admin manual override.
    const tier1Ids = round1Pool.filter((p) => p.tier === 1).map((p) => p.id);
    const roster = { teamA: tier1Ids.slice(0, 2), teamB: [] };
    const state = computeDraftState(teams, roster, round1Pool, 32);
    // Team B is behind in the tier, so it's on the clock regardless of the
    // tier's normal starting side.
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.currentTier).toBe(1);
  });

  it("scales picksPerTeamPerTier from playersStart (Round 2: 2 each, Championship: 1 each)", () => {
    const round2Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 4, `t${tier}-`));
    expect(computeDraftState(teams, {}, round2Pool, 16).picksPerTeamPerTier).toBe(2);

    const champPool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 2, `t${tier}-`));
    expect(computeDraftState(teams, {}, champPool, 8).picksPerTeamPerTier).toBe(1);
  });
});

describe("undraftedPlayersInTier", () => {
  it("returns only the given tier's players not yet drafted", () => {
    const pool = [...tierPlayers(1, 2, "a"), ...tierPlayers(2, 4, "p")];
    const drafted = new Set(["p1", "p3"]);
    const result = undraftedPlayersInTier(pool, drafted, 2);
    expect(result.map((p) => p.id).sort()).toEqual(["p2", "p4"]);
  });
});
