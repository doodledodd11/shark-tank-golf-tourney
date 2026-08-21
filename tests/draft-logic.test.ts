import { describe, expect, it } from "vitest";
import {
  computeDraftState,
  recommendedRemainingByTier,
  undraftedPlayersInTier,
  worseSeededCaptain,
  type DraftPickRecord,
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

// Both captains are auto-seated as their team's first roster slot before
// any real picking happens (see startDraftLogic in lib/draft.ts) — this is
// the real state computeDraftState always sees in production, so tests
// seed it the same way rather than starting from a literal empty roster.
const bothCaptainsSeated = { teamA: ["captainA"], teamB: ["captainB"] };

describe("computeDraftState", () => {
  it("opens a fresh Round 1 draft with the order-0 team on the clock for the first (free) real pick", () => {
    const state = computeDraftState(teams, bothCaptainsSeated, [], round1Pool, 32);
    expect(state).toEqual({ onTheClockTeamId: "teamA", requiredTier: null, recommendedPicksPerTier: 4, isComplete: false });
  });

  it("runs a snake order: the first team picks alone, then picks alternate in same-team pairs", () => {
    const picks: string[] = [];
    const roster: Record<string, string[]> = { teamA: ["captainA"], teamB: ["captainB"] };
    const picksInOrder: DraftPickRecord[] = [];

    // 32 roster slots total, 2 already filled by the seeded captains -> 30 real picks left.
    for (let i = 0; i < 30; i++) {
      const state = computeDraftState(teams, roster, picksInOrder, round1Pool, 32);
      if (state.isComplete) break;
      picks.push(state.onTheClockTeamId!);
      const taken = new Set([...roster.teamA!, ...roster.teamB!]);
      const next = round1Pool.find((p) => !taken.has(p.id))!;
      roster[state.onTheClockTeamId!]!.push(next.id);
      picksInOrder.push({ tier: next.tier });
    }

    expect(picks).toHaveLength(30);
    expect(picks[0]).toBe("teamA"); // first team to pick gets just the one pick...
    expect(picks[1]).toBe("teamB"); // ...then the other team gets a two-pick makeup right away
    for (let i = 1; i + 1 < picks.length; i += 2) {
      expect(picks[i]).toBe(picks[i + 1]); // every pair after the opener goes to the same team
    }
    for (let i = 1; i + 2 < picks.length; i += 2) {
      expect(picks[i]).not.toBe(picks[i + 2]); // consecutive pairs alternate which team
    }
    expect(roster.teamA).toHaveLength(16);
    expect(roster.teamB).toHaveLength(16);
  });

  it("allows a free pick to come from any tier — e.g. tier 4 before tier 1 is touched", () => {
    // Team A's first real pick is from tier 4, well before tier 1 is touched.
    const tier4Id = round1Pool.find((p) => p.tier === 4)!.id;
    const roster = { teamA: ["captainA", tier4Id], teamB: ["captainB"] };
    const state = computeDraftState(teams, roster, [{ tier: 4 }], round1Pool, 32);
    // Nothing about this is invalid — it's simply Team B's turn next, and
    // that next pick is now locked to tier 4 (see the mirror-pick tests
    // below) since it's the response to a free pick.
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.isComplete).toBe(false);
  });

  it("locks the mirror pick (every 2nd real pick) to the tier the pick right before it came from", () => {
    const tier3Id = round1Pool.find((p) => p.tier === 3)!.id;
    const roster = { teamA: ["captainA", tier3Id], teamB: ["captainB"] };
    const state = computeDraftState(teams, roster, [{ tier: 3 }], round1Pool, 32);
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.requiredTier).toBe(3);
  });

  it("leaves the very first pick of the draft free, and every other 'leader' pick free too", () => {
    const openingState = computeDraftState(teams, bothCaptainsSeated, [], round1Pool, 32);
    expect(openingState.requiredTier).toBeNull();

    // Index 2 (the 3rd real pick) is a fresh leader pick, not a mirror —
    // 2 real picks already made (1 free, 1 mirror), the next one is free again.
    const tier1 = round1Pool.filter((p) => p.tier === 1);
    const roster = { teamA: ["captainA", tier1[0]!.id], teamB: ["captainB", tier1[1]!.id] };
    const picksInOrder: DraftPickRecord[] = [{ tier: 1 }, { tier: 1 }];
    const state = computeDraftState(teams, roster, picksInOrder, round1Pool, 32);
    expect(state.requiredTier).toBeNull();
  });

  it("falls back to a free pick once the mirrored tier has no eligible players left", () => {
    // A tiny championship-sized pool: 2 players per tier, 8 total.
    const champPool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 2, `t${tier}-`));
    // Team A's captain happens to be tier 3's first player; their one real
    // pick takes tier 3's other player — tier 3 is now fully drafted.
    const roster = { teamA: ["t3-1", "t3-2"], teamB: ["captainB"] };
    const state = computeDraftState(teams, roster, [{ tier: 3 }], champPool, 8);
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.requiredTier).toBeNull(); // would be 3, but nobody's left in tier 3
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
    const state = computeDraftState(teams, roster, [], round1Pool, 32);
    expect(state).toEqual({ onTheClockTeamId: null, requiredTier: null, recommendedPicksPerTier: 4, isComplete: true });
  });

  it("skips a team that has already filled its whole roster, even on equal-looking counts", () => {
    // Round 2: Team A already has all 8 picks. Team B has fewer.
    const round2Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 4, `t${tier}-`));
    const teamAFull = round2Pool.slice(0, 8).map((p) => p.id);
    const teamBPartial = round2Pool.slice(8, 12).map((p) => p.id);
    const state = computeDraftState(teams, { teamA: teamAFull, teamB: teamBPartial }, [], round2Pool, 16);
    expect(state.onTheClockTeamId).toBe("teamB");
    expect(state.isComplete).toBe(false);
  });

  it("scales recommendedPicksPerTier from playersStart (Round 2: 2 each, Championship: 1 each)", () => {
    const round2Pool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 4, `t${tier}-`));
    expect(computeDraftState(teams, {}, [], round2Pool, 16).recommendedPicksPerTier).toBe(2);

    const champPool: DraftPlayer[] = [1, 2, 3, 4].flatMap((tier) => tierPlayers(tier, 2, `t${tier}-`));
    expect(computeDraftState(teams, {}, [], champPool, 8).recommendedPicksPerTier).toBe(1);
  });
});

describe("recommendedRemainingByTier", () => {
  it("starts every tier at the full recommended target for an empty roster", () => {
    expect(recommendedRemainingByTier([], round1Pool, 4)).toEqual({ 1: 4, 2: 4, 3: 4, 4: 4 });
  });

  it("counts down only the tiers actually picked from", () => {
    const roster = [
      round1Pool.find((p) => p.tier === 4)!.id,
      round1Pool.filter((p) => p.tier === 4)[1]!.id,
      round1Pool.find((p) => p.tier === 2)!.id,
    ];
    expect(recommendedRemainingByTier(roster, round1Pool, 4)).toEqual({ 1: 4, 2: 3, 3: 4, 4: 2 });
  });

  it("floors at zero rather than going negative once a tier is past its recommended target", () => {
    const tier1Ids = round1Pool.filter((p) => p.tier === 1).map((p) => p.id);
    expect(recommendedRemainingByTier(tier1Ids, round1Pool, 4)[1]).toBe(0);
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

describe("worseSeededCaptain", () => {
  it("lets tier decide regardless of seed when captains are in different tiers", () => {
    expect(worseSeededCaptain({ tier: 1, seed: 8 }, { tier: 4, seed: 1 })).toBe("b"); // tier 4 is worse
    expect(worseSeededCaptain({ tier: 3, seed: 1 }, { tier: 2, seed: 8 })).toBe("a"); // tier 3 is worse
  });

  it("compares seed within the same tier — higher seed number is worse", () => {
    expect(worseSeededCaptain({ tier: 2, seed: 5 }, { tier: 2, seed: 1 })).toBe("a");
    expect(worseSeededCaptain({ tier: 2, seed: 1 }, { tier: 2, seed: 5 })).toBe("b");
  });

  it("treats a missing seed as worse than any set seed in the same tier", () => {
    expect(worseSeededCaptain({ tier: 1, seed: null }, { tier: 1, seed: 8 })).toBe("a");
    expect(worseSeededCaptain({ tier: 1, seed: 8 }, { tier: 1, seed: null })).toBe("b");
  });

  it("defaults to `a` on a full tie (same tier, both missing seeds)", () => {
    expect(worseSeededCaptain({ tier: 2, seed: null }, { tier: 2, seed: null })).toBe("a");
  });
});
