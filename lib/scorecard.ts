// Core I/O for the site's own live scorecard — a per-side link (see
// Match.teamASideAccessToken / teamBSideAccessToken) that lets either
// teammate enter their side's 18 hole scores. Deliberately kept free of
// Next.js request-scoped calls, same pattern as draft.ts / matchmaking.ts —
// see lib/actions/scorecard.ts for the "use server" wrappers.

import { prisma } from "@/lib/db";
import { getMatchWithDetails } from "@/lib/data";
import { getSideNames } from "@/lib/match-helpers";
import { computeMatchSegmentsFromHoles, deriveMatchStatus, type ComputedMatchSegments } from "@/lib/scorecard-logic";

export interface FormState {
  error?: string;
  success?: boolean;
}

/** Issues a teamASideAccessToken/teamBSideAccessToken for a match if it
 * doesn't already have one — safe to call any time, reuses whatever
 * already exists rather than rotating it. */
export async function ensureSideAccessTokensLogic(matchId: string): Promise<FormState> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Match not found." };

  const data: { teamASideAccessToken?: string; teamBSideAccessToken?: string } = {};
  if (!match.teamASideAccessToken) data.teamASideAccessToken = crypto.randomUUID();
  if (!match.teamBSideAccessToken) data.teamBSideAccessToken = crypto.randomUUID();
  if (Object.keys(data).length > 0) {
    await prisma.match.update({ where: { id: matchId }, data });
  }
  return { success: true };
}

function sideFromToken(match: { teamASideAccessToken: string | null; teamBSideAccessToken: string | null }, token: string): "A" | "B" | null {
  if (match.teamASideAccessToken && match.teamASideAccessToken === token) return "A";
  if (match.teamBSideAccessToken && match.teamBSideAccessToken === token) return "B";
  return null;
}

export interface ScorecardEntryData {
  matchId: string;
  matchLabel: string;
  side: "A" | "B";
  myNames: string;
  opponentNames: string;
  courseName: string | null;
  parByHole: number[];
  strokeIndexByHole: number[];
  myHoles: number[];
  segments: ComputedMatchSegments;
  matchStatus: string;
}

/** Everything one side's scorecard-entry page needs. Both teammates share
 * the same link and the same underlying data, so either one opening it
 * (even at the same time) sees the same 18 holes and can update them —
 * there's no per-player distinction within a side. */
export async function getScorecardEntryData(matchId: string, token: string): Promise<ScorecardEntryData | null> {
  const match = await getMatchWithDetails(matchId);
  if (!match) return null;
  const side = sideFromToken(match, token);
  if (!side) return null;

  const myHoles = side === "A" ? match.teamAHoleScores : match.teamBHoleScores;
  const segments = computeMatchSegmentsFromHoles(match.teamAHoleScores, match.teamBHoleScores);

  return {
    matchId: match.id,
    matchLabel: `${match.round.name} · Match ${match.matchNumber}`,
    side,
    myNames: getSideNames(match, side),
    opponentNames: getSideNames(match, side === "A" ? "B" : "A"),
    courseName: match.course?.name ?? null,
    parByHole: match.course?.parByHole ?? [],
    strokeIndexByHole: match.course?.strokeIndexByHole ?? [],
    myHoles,
    segments,
    matchStatus: match.status,
  };
}

const SEGMENT_ROW_NAMES = { front9: "Front 9", back9: "Back 9", overall: "Overall 18" } as const;

/** Saves one side's 18 hole scores, recomputes all three segments from
 * both sides' current data, and writes the result into the match's
 * existing MatchSegment rows (and the match's own status) — everything
 * downstream (round totals, the match cards, the admin segment editor)
 * keeps reading those exactly as before. */
export async function submitHoleScoresLogic(input: { matchId: string; token: string; holes: number[] }): Promise<FormState> {
  if (input.holes.length !== 18) return { error: "A scorecard needs exactly 18 holes." };
  if (input.holes.some((h) => h < 0 || h > 20)) return { error: "That doesn't look like a real hole score." };

  const match = await getMatchWithDetails(input.matchId);
  if (!match) return { error: "Match not found." };
  const side = sideFromToken(match, input.token);
  if (!side) return { error: "That link isn't valid." };

  const teamAHoles = side === "A" ? input.holes : match.teamAHoleScores;
  const teamBHoles = side === "B" ? input.holes : match.teamBHoleScores;
  const segments = computeMatchSegmentsFromHoles(teamAHoles, teamBHoles);
  const matchStatus = deriveMatchStatus(segments, match.status);

  const segmentByName = new Map(match.segments.map((s) => [s.name, s]));
  const segmentUpdates = (Object.keys(SEGMENT_ROW_NAMES) as (keyof typeof SEGMENT_ROW_NAMES)[]).flatMap((key) => {
    const existing = segmentByName.get(SEGMENT_ROW_NAMES[key]);
    if (!existing) return [];
    const computed = segments[key];
    return [
      prisma.matchSegment.update({
        where: { id: existing.id },
        data: { teamAScore: computed.teamAScore, teamBScore: computed.teamBScore, winner: computed.winner, status: computed.status },
      }),
    ];
  });

  await prisma.$transaction([
    prisma.match.update({
      where: { id: input.matchId },
      data: {
        ...(side === "A" ? { teamAHoleScores: input.holes } : { teamBHoleScores: input.holes }),
        status: matchStatus,
      },
    }),
    ...segmentUpdates,
  ]);

  return { success: true };
}
