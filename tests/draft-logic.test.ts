import { describe, expect, it } from "vitest";
import {
  computeDraftState,
  remainingCapacityByTier,
  undraftedPlayersInTier,
  type DraftPlayer,
  type DraftTeam,
} from "@/lib/draft-logic";

const teamA: DraftTeam = { id: "teamA", order: 0 };
const teamB: DraftTeam = { id: "teamB", order: 1 };
const teams: [DraftTeam, DraftTeam] = [teamA, teamB];

function tierPlayers(tier: number, count: number, prefix: string): DraftPlayer[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}`, tier }));
}

// A believable Round 1 pool: 8 players per tier, 32 total.
const round1Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 8, `t${tier}-`));

describe("computeDraftState", () => {
  it("opens a fresh Round 1 draft with the order-0 team on the clock", () => {
    const state = computeDraftState(teams, {}, round1Pool, 32);
    expect(state).toEqual({ onTheClockTeamId: "teamA", picksPerTeamPerTier: 4, isComplete: false });
  });

  it("alternates strictly by total picks made (A, B, A, B, ...), independent of tier", () => {
    const picks: string[] = [];
    const roster: Record<string, string[]> = { teamA: [], teamB: [] };

    for (let i = 0; i < 32; i++) {
      const state = computeDraftState(teams, roster, round1Pool, 32);
      if (state.isComplete) break;
      picks.push(state.onTheClockTeamId!);
      const taken = new Set([...roster.teamA!, ...roster.teamB!]);
      const next = round1Pool.find((p) => !taken.has(p.id))!;
      roster[state.onTheClockTeamId!]!.push(next.id);
    }

    expect(picks).toHaveLength(32);
    expect(picks.every((p, i) => p === (i % 2 === 0 ? "teamA" : "teamB"))).toBe(true);
    expect(roster.teamA).toHaveLength(16);
    expect(roster.teamB).toHaveLength(16);
  });

  it("allows a team to draft out of tier order — e.g. a tier-4 player before any tier-1 pick", () => {
    // Team A's very first pick is from tier 4, well before tier 1 is touched.
    const tier4Id = round1Pool.find((p) => p.tier === 4)!.id;
    const roster = { teamA: [tier4Id], teamB: [] };
    const state = computeDraftState(teams, roster, round1Pool, 32);
    // Nothing about this is invalid — it's simply Team B's turn next, same
    // as it would be after any other single pick.
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.isComplete).toBe(false);
  });

  it("reports the draft complete once both teams have made all 16 of their picks", () => {
    const tier1Ids = round1Pool.filter((p) => p.tier === 1).map((p) => p.id);
    const tier2Ids = round1Pool.filter((p) => p.tier === 2).map((p) => p.id);
    const tier3Ids = round1Pool.filter((p) => p.tier === 3).map((p) => p.id);
    const tier4Ids = round1Pool.filter((p) => p.tier === 4).map((p) => p.id);
    const roster = {
      teamA: [...tier1Ids.slice(0, 4), ...tier2Ids.slice(0, 4), ...tier3Ids.slice(0, 4), ...tier4Ids.slice(0, 4)],
      teamB: [...tier1Ids.slice(4, 8), ...tier2Ids.slice(4, 8), ...tier3Ids.slice(4, 8), ...tier4Ids.slice(4, 8)],
    };
    const state = computeDraftState(teams, roster, round1Pool, 32);
    expect(state).toEqual({ onTheClockTeamId: null, picksPerTeamPerTier: 4, isComplete: true });
  });

  it("self-corrects toward balance if the two teams' pick counts get out of sync", () => {
    const someIds = round1Pool.slice(0, 3).map((p) => p.id);
    const roster = { teamA: someIds, teamB: [] };
    const state = computeDraftState(teams, roster, round1Pool, 32);
    expect(state.onTheClockTeamId).toBe("teamB");
  });

  it("skips a team that has already filled its whole roster, even on equal-looking counts", () => {
    // Round 2: Team A already has all 8 picks. Team B has fewer.
    const round2Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 4, `t${tier}-`));
    const teamAFull = round2Pool.slice(0, 8).map((p) => p.id);
    const teamBPartial = round2Pool.slice(8, 12).map((p) => p.id);
    const state = computeDraftState(teams, { teamA: teamAFull, teamB: teamBPartial }, round2Pool, 16);
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.isComplete).toBe(false);
  });

  it("scales picksPerTeamPerTier from playersStart (Round 2: 2 each, Championship: 1 each)", () => {
    const round2Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 4, `t${tier}-`));
    expect(computeDraftState(teams, {}, round2Pool, 16).picksPerTeamPerTier).toBe(2);

    const champPool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 2, `t${tier}-`));
    expect(computeDraftState(teams, {}, champPool, 8).picksPerTeamPerTier).toBe(1);
  });
});

describe("remainingCapacityByTier", () => {
  it("starts every tier at full capacity for an empty roster", () => {
    expect(remainingCapacityByTier([], round1Pool, 4)).toEqual({ 1: 4, 2: 4, 3: 4, 4: 4 });
  });

  it("counts down only the tiers actually picked from", () => {
    const roster = [
      round1Pool.find((p) => p.tier === 4)!.id,
      round1Pool.filter((p) => p.tier === 4)[1]!.id,
      round1Pool.find((p) => p.tier === 2)!.id,
    ];
    expect(remainingCapacityByTier(roster, round1Pool, 4)).toEqual({ 1: 4, 2: 3, 3: 4, 4: 2 });
  });

  it("floors at zero rather than going negative if a tier is over-full", () => {
    const tier1Ids = round1Pool.filter((p) => p.tier === 1).map((p) => p.id);
    expect(remainingCapacityByTier(tier1Ids, round1Pool, 4)[1]).toBe(0);
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
