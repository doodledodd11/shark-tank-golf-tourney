// Core I/O for a player's personal, token-gated course-selection page.
// Kept free of Next.js request-scoped calls, same pattern as draft.ts and
// matchmaking.ts — see lib/actions/course-selection.ts for the "use
// server" wrappers.

import { prisma } from "@/lib/db";
import { getActiveTournament, getCourses } from "@/lib/data";

export interface PlayerCourseSelectionData {
  matchId: string;
  matchLabel: string;
  playerId: string;
  playerName: string;
  courses: { id: string; name: string }[];
  currentCourseId: string | null;
  decided: boolean;
  decidedCourseName: string | null;
}

/** Everything one player's personal course-selection link needs — scoped
 * to just that player's own pick for that one match via their
 * MatchParticipant.accessToken. Returns null for an invalid/unknown token
 * so the page can show a generic "this link isn't valid" state without
 * distinguishing why. */
export async function getPlayerCourseSelectionData(matchId: string, token: string): Promise<PlayerCourseSelectionData | null> {
  const participant = await prisma.matchParticipant.findFirst({
    where: { matchId, accessToken: token },
    include: {
      player: true,
      match: { include: { round: true, course: true } },
    },
  });
  if (!participant) return null;

  const tournament = await getActiveTournament();
  const courses = await getCourses(tournament.id);
  const selectable = courses.filter((c) => c.active && c.approved);

  const existingSelection = await prisma.courseSelection.findUnique({
    where: { matchId_playerId: { matchId, playerId: participant.playerId } },
  });

  return {
    matchId,
    matchLabel: `${participant.match.round.name} · Match ${participant.match.matchNumber}`,
    playerId: participant.playerId,
    playerName: participant.player.name,
    courses: selectable.map((c) => ({ id: c.id, name: c.name })),
    currentCourseId: existingSelection?.courseId ?? null,
    decided: Boolean(participant.match.courseId),
    decidedCourseName: participant.match.course?.name ?? null,
  };
}

export interface EnsureTokensResult {
  error?: string;
  success?: boolean;
}

/** Issues an accessToken for any of a match's participants who don't
 * already have one. Safe to call repeatedly — existing tokens are never
 * rotated, so a link already sent out keeps working. */
export async function ensurePlayerAccessTokensLogic(matchId: string): Promise<EnsureTokensResult> {
  const participants = await prisma.matchParticipant.findMany({ where: { matchId } });
  if (participants.length === 0) return { error: "This match has no participants yet." };

  for (const p of participants) {
    if (p.accessToken) continue;
    await prisma.matchParticipant.update({ where: { id: p.id }, data: { accessToken: crypto.randomUUID() } });
  }
  return { success: true };
}
