import { describe, expect, it } from "vitest";
import {
  computeHoleWinners,
  computeMatchPlayStatus,
  computeMatchSegmentsFromHoles,
  computeSegmentWinner,
  deriveMatchStatus,
} from "@/lib/scorecard-logic";

const EMPTY = Array(18).fill(0);
const FRONT_ONLY = [4, 4, 4, 4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 36 on front, back untouched
const FULL_LOW = [4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 4, 4, 5, 4, 3, 4]; // par, 70 total
const FULL_HIGH = [5, 4, 5, 5, 4, 5, 6, 5, 5, 4, 5, 5, 5, 5, 6, 5, 4, 5]; // worse, higher total

describe("computeSegmentWinner", () => {
  it("gives it to the lower score", () => {
    expect(computeSegmentWinner(70, 75)).toBe("A");
    expect(computeSegmentWinner(75, 70)).toBe("B");
  });
  it("ties on equal scores", () => {
    expect(computeSegmentWinner(72, 72)).toBe("TIE");
  });
  it("returns null if either side is missing", () => {
    expect(computeSegmentWinner(null, 72)).toBeNull();
    expect(computeSegmentWinner(72, null)).toBeNull();
  });
});

describe("computeMatchSegmentsFromHoles", () => {
  it("reports everything PENDING when nobody's entered anything", () => {
    const result = computeMatchSegmentsFromHoles(EMPTY, EMPTY);
    for (const seg of [result.front9, result.back9, result.overall]) {
      expect(seg).toEqual({ teamAScore: null, teamBScore: null, status: "PENDING", winner: null });
    }
  });

  it("shows one side's own front-9 total as soon as they finish it, even if the other side hasn't started", () => {
    const result = computeMatchSegmentsFromHoles(FRONT_ONLY, EMPTY);
    expect(result.front9.teamAScore).toBe(36);
    expect(result.front9.teamBScore).toBeNull();
    expect(result.front9.status).toBe("IN_PROGRESS"); // A done, B hasn't started — not PENDING, not COMPLETE
    expect(result.front9.winner).toBeNull(); // no winner until both sides are in
  });

  it("marks Back 9 PENDING and Overall IN_PROGRESS while only the front is being played", () => {
    const result = computeMatchSegmentsFromHoles(FRONT_ONLY, EMPTY);
    expect(result.back9.status).toBe("PENDING");
    expect(result.overall.status).toBe("IN_PROGRESS");
    expect(result.overall.teamAScore).toBeNull(); // A hasn't finished all 18 yet
  });

  it("completes every segment once both sides finish all 18, and picks the right winner each", () => {
    const result = computeMatchSegmentsFromHoles(FULL_LOW, FULL_HIGH);
    expect(result.front9).toEqual({ teamAScore: 35, teamBScore: 44, status: "COMPLETE", winner: "A" });
    expect(result.back9).toEqual({ teamAScore: 35, teamBScore: 44, status: "COMPLETE", winner: "A" });
    expect(result.overall).toEqual({ teamAScore: 70, teamBScore: 88, status: "COMPLETE", winner: "A" });
  });

  it("ties a segment when both sides post the same total", () => {
    const result = computeMatchSegmentsFromHoles(FULL_LOW, FULL_LOW);
    expect(result.overall.winner).toBe("TIE");
  });
});

describe("deriveMatchStatus", () => {
  it("leaves the match status alone when nothing's been entered", () => {
    const segments = computeMatchSegmentsFromHoles(EMPTY, EMPTY);
    expect(deriveMatchStatus(segments, "SCHEDULED")).toBe("SCHEDULED");
  });

  it("moves to IN_PROGRESS once any hole is entered on either side", () => {
    const segments = computeMatchSegmentsFromHoles(FRONT_ONLY, EMPTY);
    expect(deriveMatchStatus(segments, "SCHEDULED")).toBe("IN_PROGRESS");
  });

  it("moves to COMPLETE once the Overall segment is fully decided", () => {
    const segments = computeMatchSegmentsFromHoles(FULL_LOW, FULL_HIGH);
    expect(deriveMatchStatus(segments, "IN_PROGRESS")).toBe("COMPLETE");
  });
});

describe("computeHoleWinners", () => {
  it("gives each hole to whoever scored lower, ties when equal, null until both sides post that hole", () => {
    const a = [4, 5, 4, 0];
    const b = [5, 4, 4, 6];
    expect(computeHoleWinners(a, b)).toEqual(["A", "B", "TIE", null]);
  });
});

describe("computeMatchPlayStatus", () => {
  it("reports no holes played when nothing's decided yet", () => {
    expect(computeMatchPlayStatus([null, null, null])).toEqual({ leaderSide: null, margin: 0, holesPlayed: 0 });
  });

  it("counts wins minus losses toward whoever's ahead", () => {
    // A wins 3, B wins 1, 1 tie -> A 2 up thru 5
    const status = computeMatchPlayStatus(["A", "A", "A", "B", "TIE"]);
    expect(status).toEqual({ leaderSide: "A", margin: 2, holesPlayed: 5 });
  });

  it("reports all square when wins are even", () => {
    const status = computeMatchPlayStatus(["A", "B", "TIE"]);
    expect(status).toEqual({ leaderSide: null, margin: 0, holesPlayed: 3 });
  });

  it("matches the front-9 example: A wins 5, B wins 2, 2 ties -> 3 up thru 9", () => {
    const teamA = [5, 4, 2, 5, 5, 4, 3, 3, 4];
    const teamB = [6, 4, 3, 4, 6, 3, 3, 4, 5];
    const status = computeMatchPlayStatus(computeHoleWinners(teamA, teamB));
    expect(status).toEqual({ leaderSide: "A", margin: 3, holesPlayed: 9 });
  });
});
