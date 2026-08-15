// Pure, side-effect-free tournament math. Nothing in this file touches the
// database or the network, which is what makes it straightforward to unit
// test (see tests/tournament-logic.test.ts). UI code and API routes should
// call into these functions rather than re-implementing scoring inline.

import type { Winner } from "./constants";

export interface SegmentLike {
  pointsAvailable: number;
  winner: string | null;
}

export interface PointTotals {
  teamA: number;
  teamB: number;
}

/** Points earned by each side from a single segment. Ties split evenly. */
export function computeSegmentPoints(segment: SegmentLike): PointTotals {
  const { pointsAvailable, winner } = segment;
  if (winner === "A") return { teamA: pointsAvailable, teamB: 0 };
  if (winner === "B") return { teamA: 0, teamB: pointsAvailable };
  if (winner === "TIE") return { teamA: pointsAvailable / 2, teamB: pointsAvailable / 2 };
  return { teamA: 0, teamB: 0 }; // not yet decided
}

/** Sums points across any list of segments — a match's own segments, or
 * every segment across every match in a round; the math is identical. */
export function sumSegmentPoints(segments: SegmentLike[]): PointTotals {
  return segments.reduce<PointTotals>(
    (acc, seg) => {
      const { teamA, teamB } = computeSegmentPoints(seg);
      return { teamA: acc.teamA + teamA, teamB: acc.teamB + teamB };
    },
    { teamA: 0, teamB: 0 },
  );
}

/** Total points for a single match, from its segments. */
export function calculateMatchTotals(segments: SegmentLike[]): PointTotals {
  return sumSegmentPoints(segments);
}

/** Total points across every match in a round. */
export function calculateRoundTotals(matches: { segments: SegmentLike[] }[]): PointTotals {
  return sumSegmentPoints(matches.flatMap((m) => m.segments));
}

/**
 * The leading/winning side given a set of segments, or `null` if nothing
 * has been decided yet (no segment has a winner recorded). Once at least
 * one segment is decided, an equal split is reported as "TIE" rather than
 * `null` — those are different states in the UI (undecided vs. tied).
 */
export function determineWinner(segments: SegmentLike[]): Winner | null {
  const anyDecided = segments.some((s) => s.winner !== null);
  if (!anyDecided) return null;
  const { teamA, teamB } = sumSegmentPoints(segments);
  if (teamA > teamB) return "A";
  if (teamB > teamA) return "B";
  return "TIE";
}

export interface RoundResultInput {
  matches: { segments: SegmentLike[]; isPlayoff: boolean; winnerOverride?: Winner | null }[];
}

export interface RoundResult extends PointTotals {
  leader: Winner | null;
  /** True when the round total is tied and a playoff match is needed/used. */
  needsPlayoff: boolean;
  /** "A" | "B" once a side has actually advanced, else null. */
  advancing: "A" | "B" | null;
}

/**
 * Combines the point totals from every non-playoff match with a captain
 * playoff result (if one was recorded) to determine which side advances.
 * A tied round total with no playoff match yet is reported as
 * `needsPlayoff: true, advancing: null` so the UI can prompt for one.
 */
export function calculateRoundResult(input: RoundResultInput): RoundResult {
  const scoredMatches = input.matches.filter((m) => !m.isPlayoff);
  const { teamA, teamB } = calculateRoundTotals(scoredMatches);
  const leader: Winner | null = teamA === teamB ? (teamA === 0 && teamB === 0 ? null : "TIE") : teamA > teamB ? "A" : "B";

  if (teamA !== teamB) {
    return { teamA, teamB, leader, needsPlayoff: false, advancing: teamA > teamB ? "A" : "B" };
  }

  const playoff = input.matches.find((m) => m.isPlayoff);
  const playoffWinner = playoff ? determineWinner(playoff.segments) ?? playoff.winnerOverride : undefined;
  const advancing = playoffWinner === "A" || playoffWinner === "B" ? playoffWinner : null;

  return { teamA, teamB, leader, needsPlayoff: true, advancing };
}

/**
 * Prize money awarded to each of the winning championship players, in
 * cents. Deliberately defensive: a tournament with no prize pool set yet,
 * or a split size of zero, should render "$0" rather than throwing or
 * producing NaN/Infinity.
 */
export function calculatePrizePerPlayer(
  prizePoolCents: number | null | undefined,
  splitSize: number | null | undefined,
): number {
  if (!prizePoolCents || prizePoolCents <= 0) return 0;
  if (!splitSize || splitSize <= 0) return 0;
  return Math.floor(prizePoolCents / splitSize);
}

export interface CourseSelectionLike {
  courseId: string;
}

/**
 * Builds the weighted random-draw pool for course selection: each player's
 * choice adds one entry for that course, so a course picked by multiple
 * players is proportionally more likely to be drawn. This is the exact
 * behavior described in the spec:
 *
 *   John -> A, Mike -> A, Steve -> B, Chris -> C
 *   pool = [A, A, B, C]  (Course A has a 50% chance)
 */
export function buildCourseSelectionPool(selections: CourseSelectionLike[]): string[] {
  return selections.map((s) => s.courseId);
}

/**
 * Picks a random course from the weighted pool built from `selections`.
 * `rng` defaults to Math.random but can be injected for deterministic
 * tests. Returns null when there are no selections to draw from.
 */
export function pickRandomCourse(
  selections: CourseSelectionLike[],
  rng: () => number = Math.random,
): string | null {
  const pool = buildCourseSelectionPool(selections);
  if (pool.length === 0) return null;
  const index = Math.floor(rng() * pool.length);
  // Guard against rng() returning exactly 1 (out of range by one index).
  const safeIndex = Math.min(index, pool.length - 1);
  return pool[safeIndex] ?? null;
}

/** Tallies how many players fall in each of the 4 skill tiers. */
export function countByTier(players: { tier: number }[]): Record<number, number> {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const p of players) {
    counts[p.tier] = (counts[p.tier] ?? 0) + 1;
  }
  return counts;
}
