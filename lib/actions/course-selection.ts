"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession, isAdminSession } from "@/lib/dal";
import { pickRandomCourse } from "@/lib/tournament-logic";
import { ensurePlayerAccessTokensLogic } from "@/lib/course-selection";
import { sendCourseSelectionEmail, getSiteUrl } from "@/lib/email";

// A player's own pick now requires either their personal accessToken (see
// MatchParticipant.accessToken and /courses/[matchId]/[token]) or an admin
// session — the general public can watch which matches still need a
// course, but can no longer submit on anyone's behalf. The admin's own
// CourseSelectionTool still works unchanged: it's already running inside
// an authenticated session, so it never needs to pass a token.

const selectionSchema = z.object({
  matchId: z.string().min(1),
  playerId: z.string().min(1),
  courseId: z.string().min(1),
  accessToken: z.string().optional(),
});

function revalidatePublicPages() {
  revalidatePath("/courses");
  revalidatePath("/matches");
  revalidatePath("/players");
  revalidatePath("/");
}

export async function submitCourseSelection(input: { matchId: string; playerId: string; courseId: string; accessToken?: string }) {
  const data = selectionSchema.parse(input);

  const [participant, course] = await Promise.all([
    prisma.matchParticipant.findUnique({
      where: { matchId_playerId: { matchId: data.matchId, playerId: data.playerId } },
    }),
    prisma.course.findUnique({ where: { id: data.courseId } }),
  ]);
  if (!participant) {
    throw new Error("That player isn't one of the four in this match.");
  }

  const hasValidToken = Boolean(data.accessToken) && data.accessToken === participant.accessToken;
  if (!hasValidToken && !(await isAdminSession())) {
    throw new Error("You need your personal course-selection link to make this pick.");
  }

  if (!course || !course.active || !course.approved) {
    throw new Error("That course isn't currently available for selection.");
  }

  await prisma.courseSelection.upsert({
    where: { matchId_playerId: { matchId: data.matchId, playerId: data.playerId } },
    update: { courseId: data.courseId },
    create: { matchId: data.matchId, playerId: data.playerId, courseId: data.courseId },
  });

  revalidatePublicPages();
}

/** Admin-only: makes sure every participant in a match has a personal
 * link, then emails whoever has an address on file. Players without an
 * email on record are reported back as skipped rather than silently
 * dropped, so the admin knows to share their link some other way. */
export async function sendCourseSelectionEmails(matchId: string): Promise<{ error?: string; sent?: string[]; skipped?: string[] }> {
  await requireAdminSession();

  const ensured = await ensurePlayerAccessTokensLogic(matchId);
  if (ensured.error) return { error: ensured.error };

  const participants = await prisma.matchParticipant.findMany({
    where: { matchId },
    include: { player: true, match: { include: { round: true } } },
  });

  const siteUrl = getSiteUrl();
  const sent: string[] = [];
  const skipped: string[] = [];

  for (const p of participants) {
    if (!p.player.email) {
      skipped.push(`${p.player.name} (no email on file)`);
      continue;
    }
    const link = `${siteUrl}/courses/${matchId}/${p.accessToken}`;
    const matchLabel = `${p.match.round.name} · Match ${p.match.matchNumber}`;
    const result = await sendCourseSelectionEmail({ to: p.player.email, playerName: p.player.name, matchLabel, link });
    if (result.error) {
      skipped.push(`${p.player.name} (${result.error})`);
      continue;
    }
    sent.push(p.player.name);
  }

  revalidatePublicPages();
  return { sent, skipped };
}

/** Admin-only: issues personal links for a match's participants without
 * sending anything, for copy/share-manually fallback (same pattern as the
 * captain and pairing links elsewhere in the admin). */
export async function ensurePlayerAccessTokens(matchId: string): Promise<{ error?: string; success?: boolean }> {
  await requireAdminSession();
  const result = await ensurePlayerAccessTokensLogic(matchId);
  if (result.success) revalidatePublicPages();
  return result;
}

/** Draws the official course from the submitted selections. Picking a
 * course (above) stays open to all four players, but committing to the
 * result is a one-way door for the match — so only the admin runs it. */
export async function randomizeMatchCourse(matchId: string): Promise<{ courseId: string; courseName: string }> {
  await requireAdminSession();
  const [selections, match] = await Promise.all([
    prisma.courseSelection.findMany({ where: { matchId } }),
    prisma.match.findUnique({ where: { id: matchId } }),
  ]);
  if (!match) throw new Error("Match not found.");
  if (match.courseId) {
    throw new Error("This match already has an official course. The draw can only run once.");
  }
  if (selections.length === 0) throw new Error("No course selections have been submitted yet.");

  const winnerId = pickRandomCourse(selections.map((s) => ({ courseId: s.courseId })));
  if (!winnerId) throw new Error("Could not pick a course from the submitted selections.");

  const course = await prisma.course.findUnique({ where: { id: winnerId } });
  if (!course) throw new Error("Selected course no longer exists.");

  await prisma.match.update({
    where: { id: matchId },
    data: {
      courseId: winnerId,
      status: match.status === "PAIRING_PENDING" || match.status === "COURSE_SELECTION" ? "SCHEDULED" : match.status,
    },
  });

  revalidatePublicPages();
  return { courseId: winnerId, courseName: course.name };
}
