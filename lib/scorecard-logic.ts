// Pure, side-effect-free math for the site's own live scorecard — same
// spirit as tournament-logic.ts and draft-logic.ts. A side's 18 hole
// scores are the source of truth a player edits (see Match.teamAHoleScores
// / teamBHoleScores); a match's three MatchSegment rows (Front 9, Back 9,
// Overall 18) stay a derived cache kept in sync from these, so every
// existing bit of scoring/display code (round totals, match totals, the
// admin segment editor) keeps working unchanged — this only changes where
// the numbers come from, not how they're used afterward.

export type SegmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETE";
export type Winner = "A" | "B" | "TIE" | null;

export interface HoleRange {
  start: number; // inclusive, 0-indexed
  end: number; // exclusive
}

export const FRONT_NINE: HoleRange = { start: 0, end: 9 };
export const BACK_NINE: HoleRange = { start: 9, end: 18 };
export const ALL_18: HoleRange = { start: 0, end: 18 };

/** A hole score of 0 (or missing) means "not entered yet" — a real score
 * is always at least 1, so this is a safe empty sentinel without needing
 * nullable array elements in Postgres. */
function holesInRange(holes: number[], range: HoleRange): number[] {
  return holes.slice(range.start, range.end);
}

function isRangeComplete(holes: number[], range: HoleRange): boolean {
  const slice = holesInRange(holes, range);
  return slice.length === range.end - range.start && slice.every((h) => h > 0);
}

function isRangeStarted(holes: number[], range: HoleRange): boolean {
  return holesInRange(holes, range).some((h) => h > 0);
}

function sumRange(holes: number[], range: HoleRange): number {
  return holesInRange(holes, range).reduce((sum, h) => sum + Math.max(h, 0), 0);
}

interface OneSideSegment {
  score: number | null;
  status: SegmentStatus;
}

/** One side's own progress on a hole range — independent of how far the
 * other side has gotten, so "Team A shot 37" can show up as soon as Team A
 * finishes the front 9, without waiting on Team B. */
function computeOneSideSegment(holes: number[], range: HoleRange): OneSideSegment {
  if (isRangeComplete(holes, range)) return { score: sumRange(holes, range), status: "COMPLETE" };
  if (isRangeStarted(holes, range)) return { score: null, status: "IN_PROGRESS" };
  return { score: null, status: "PENDING" };
}

export function computeSegmentWinner(teamAScore: number | null, teamBScore: number | null): Winner {
  if (teamAScore == null || teamBScore == null) return null;
  if (teamAScore < teamBScore) return "A"; // fewer strokes wins
  if (teamBScore < teamAScore) return "B";
  return "TIE";
}

export interface ComputedSegment {
  teamAScore: number | null;
  teamBScore: number | null;
  status: SegmentStatus;
  winner: Winner;
}

function combineSegment(a: OneSideSegment, b: OneSideSegment): ComputedSegment {
  const status: SegmentStatus =
    a.status === "COMPLETE" && b.status === "COMPLETE"
      ? "COMPLETE"
      : a.status === "PENDING" && b.status === "PENDING"
        ? "PENDING"
        : "IN_PROGRESS";
  return {
    teamAScore: a.score,
    teamBScore: b.score,
    status,
    winner: status === "COMPLETE" ? computeSegmentWinner(a.score, b.score) : null,
  };
}

export interface ComputedMatchSegments {
  front9: ComputedSegment;
  back9: ComputedSegment;
  overall: ComputedSegment;
}

/** Derives all three segments (Front 9 / Back 9 / Overall 18) from both
 * sides' 18-hole arrays. This is the single function both the "someone
 * just submitted their side" write path and any preview/summary UI should
 * call, so the derivation logic only ever lives in one place. */
export function computeMatchSegmentsFromHoles(teamAHoles: number[], teamBHoles: number[]): ComputedMatchSegments {
  return {
    front9: combineSegment(computeOneSideSegment(teamAHoles, FRONT_NINE), computeOneSideSegment(teamBHoles, FRONT_NINE)),
    back9: combineSegment(computeOneSideSegment(teamAHoles, BACK_NINE), computeOneSideSegment(teamBHoles, BACK_NINE)),
    overall: combineSegment(computeOneSideSegment(teamAHoles, ALL_18), computeOneSideSegment(teamBHoles, ALL_18)),
  };
}

/** What the match's own status should become given its current segments —
 * complete once the Overall segment is decided, in progress as soon as
 * anything's been entered on either side, otherwise left alone (whatever
 * got it to SCHEDULED in the first place isn't this function's business). */
export function deriveMatchStatus(segments: ComputedMatchSegments, currentStatus: string): string {
  if (segments.overall.status === "COMPLETE") return "COMPLETE";
  if (segments.front9.status !== "PENDING" || segments.back9.status !== "PENDING") return "IN_PROGRESS";
  return currentStatus;
}
