import { describe, expect, it } from "vitest";
import {
  buildCourseSelectionPool,
  calculateMatchTotals,
  calculatePrizePerPlayer,
  calculateRoundResult,
  calculateRoundTotals,
  computeSegmentPoints,
  countByTier,
  determineWinner,
  pickRandomCourse,
  type SegmentLike,
} from "@/lib/tournament-logic";

describe("computeSegmentPoints", () => {
  it("awards the full point to the winning side", () => {
    expect(computeSegmentPoints({ pointsAvailable: 1, winner: "A" })).toEqual({ teamA: 1, teamB: 0 });
    expect(computeSegmentPoints({ pointsAvailable: 1, winner: "B" })).toEqual({ teamA: 0, teamB: 1 });
  });

  it("splits the point evenly on a tie", () => {
    expect(computeSegmentPoints({ pointsAvailable: 1, winner: "TIE" })).toEqual({ teamA: 0.5, teamB: 0.5 });
  });

  it("awards nothing while undecided", () => {
    expect(computeSegmentPoints({ pointsAvailable: 1, winner: null })).toEqual({ teamA: 0, teamB: 0 });
  });
});

describe("calculateMatchTotals", () => {
  it("matches the worked example from the spec (Team A 2 - Team B 1)", () => {
    const segments: SegmentLike[] = [
      { pointsAvailable: 1, winner: "A" }, // Front 9 - Scramble
      { pointsAvailable: 1, winner: "B" }, // Back 9 - Shamble
      { pointsAvailable: 1, winner: "A" }, // Overall
    ];
    expect(calculateMatchTotals(segments)).toEqual({ teamA: 2, teamB: 1 });
  });

  it("returns zero totals for a match with no segments", () => {
    expect(calculateMatchTotals([])).toEqual({ teamA: 0, teamB: 0 });
  });
});

describe("calculateRoundTotals", () => {
  it("sums points across every match, including fractional tie points", () => {
    // 8 Round-1 matches worth 3 points apiece == 24 points distributed.
    const matches: { segments: SegmentLike[] }[] = Array.from({ length: 7 }, () => ({
      segments: [
        { pointsAvailable: 1, winner: "A" },
        { pointsAvailable: 1, winner: "A" },
        { pointsAvailable: 1, winner: "B" },
      ],
    }));
    matches.push({
      segments: [
        { pointsAvailable: 1, winner: "TIE" as const },
        { pointsAvailable: 1, winner: "B" as const },
        { pointsAvailable: 1, winner: "TIE" as const },
      ],
    });
    const totals = calculateRoundTotals(matches);
    // 7 matches * (2, 1) = (14, 7); final match = (0.5 + 0 + 0.5, 0.5 + 1 + 0.5) = (1, 2)
    expect(totals).toEqual({ teamA: 15, teamB: 9 });
  });
});

describe("determineWinner", () => {
  it("is undecided when nothing has been scored", () => {
    expect(determineWinner([{ pointsAvailable: 1, winner: null }])).toBeNull();
  });

  it("reports the leading side once something is decided", () => {
    expect(
      determineWinner([
        { pointsAvailable: 1, winner: "A" },
        { pointsAvailable: 1, winner: null },
      ]),
    ).toBe("A");
  });

  it("reports TIE when totals are level and at least one segment is decided", () => {
    expect(
      determineWinner([
        { pointsAvailable: 1, winner: "A" },
        { pointsAvailable: 1, winner: "B" },
      ]),
    ).toBe("TIE");
  });
});

describe("calculateRoundResult", () => {
  const winSegments = (winner: "A" | "B"): SegmentLike[] => [{ pointsAvailable: 3, winner }];

  it("advances the side with more points, no playoff needed", () => {
    const result = calculateRoundResult({
      matches: [
        { segments: winSegments("A"), isPlayoff: false },
        { segments: winSegments("B"), isPlayoff: false },
        { segments: winSegments("A"), isPlayoff: false },
      ],
    });
    expect(result.teamA).toBe(6);
    expect(result.teamB).toBe(3);
    expect(result.needsPlayoff).toBe(false);
    expect(result.advancing).toBe("A");
  });

  it("flags a tied round as needing a playoff when none has been played yet", () => {
    const result = calculateRoundResult({
      matches: [
        { segments: winSegments("A"), isPlayoff: false },
        { segments: winSegments("B"), isPlayoff: false },
      ],
    });
    expect(result.needsPlayoff).toBe(true);
    expect(result.advancing).toBeNull();
  });

  it("resolves a tie once a captain playoff match has a winner", () => {
    const result = calculateRoundResult({
      matches: [
        { segments: winSegments("A"), isPlayoff: false },
        { segments: winSegments("B"), isPlayoff: false },
        { segments: [{ pointsAvailable: 1, winner: "B" }], isPlayoff: true },
      ],
    });
    expect(result.needsPlayoff).toBe(true);
    expect(result.advancing).toBe("B");
  });
});

describe("calculatePrizePerPlayer", () => {
  it("divides the prize pool across the split size", () => {
    expect(calculatePrizePerPlayer(480_000, 4)).toBe(120_000);
  });

  it("does not break when the prize pool is missing", () => {
    expect(calculatePrizePerPlayer(null, 4)).toBe(0);
    expect(calculatePrizePerPlayer(undefined, 4)).toBe(0);
    expect(calculatePrizePerPlayer(0, 4)).toBe(0);
  });

  it("does not break when the split size is missing or zero", () => {
    expect(calculatePrizePerPlayer(480_000, null)).toBe(0);
    expect(calculatePrizePerPlayer(480_000, 0)).toBe(0);
  });

  it("floors uneven splits instead of producing fractional cents", () => {
    expect(calculatePrizePerPlayer(100, 3)).toBe(33);
  });
});

describe("course selection randomizer", () => {
  it("builds a pool with one entry per selection, duplicates included", () => {
    // From the spec: John->A, Mike->A, Steve->B, Chris->C
    const pool = buildCourseSelectionPool([
      { courseId: "A" },
      { courseId: "A" },
      { courseId: "B" },
      { courseId: "C" },
    ]);
    expect(pool).toEqual(["A", "A", "B", "C"]);
    expect(pool).toHaveLength(4); // four entries, not three unique courses
  });

  it("returns null when there are no selections", () => {
    expect(pickRandomCourse([])).toBeNull();
  });

  it("is deterministic given an injected rng", () => {
    const selections = [{ courseId: "A" }, { courseId: "A" }, { courseId: "B" }, { courseId: "C" }];
    expect(pickRandomCourse(selections, () => 0)).toBe("A"); // index 0
    expect(pickRandomCourse(selections, () => 0.99)).toBe("C"); // index 3
    expect(pickRandomCourse(selections, () => 0.5)).toBe("B"); // index 2
  });

  it("never selects an index outside the pool even if rng() returns 1", () => {
    const selections = [{ courseId: "A" }, { courseId: "B" }];
    expect(pickRandomCourse(selections, () => 1)).toBe("B");
  });

  it("weights duplicate selections proportionally over many trials", () => {
    const selections = [{ courseId: "A" }, { courseId: "A" }, { courseId: "B" }, { courseId: "C" }];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const pick = pickRandomCourse(selections, Math.random);
      if (pick) counts[pick] = (counts[pick] ?? 0) + 1;
    }
    // Course A should land close to 50% of draws; allow generous tolerance
    // to keep this test from flaking.
    const shareA = (counts.A ?? 0) / trials;
    expect(shareA).toBeGreaterThan(0.4);
    expect(shareA).toBeLessThan(0.6);
  });
});

describe("countByTier", () => {
  it("tallies players per tier, defaulting empty tiers to zero", () => {
    const players = [{ tier: 1 }, { tier: 1 }, { tier: 3 }];
    expect(countByTier(players)).toEqual({ 1: 2, 2: 0, 3: 1, 4: 0 });
  });
});
