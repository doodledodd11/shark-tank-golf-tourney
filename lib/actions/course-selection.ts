"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { pickRandomCourse } from "@/lib/tournament-logic";

// Deliberately public — players don't have accounts, and picking a course
// for an upcoming match is a collaborative, low-stakes action meant to be
// usable by whichever of the four players (or the admin) is at a keyboard.
// The only guard is that the player must actually be one of the match's
// four participants, which stops obviously wrong submissions without
// requiring a login system the spec explicitly says to avoid.

const selectionSchema = z.object({
  matchId: z.string().min(1),
  playerId: z.string().min(1),
  courseId: z.string().min(1),
});

function revalidatePublicPages() {
  revalidatePath("/courses");
  revalidatePath("/matches");
  revalidatePath("/players");
  revalidatePath("/");
}

export async function submitCourseSelection(input: { matchId: string; playerId: string; courseId: string }) {
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
  if (!course || !course.active || !course.approved) {
    throw new Error("That course isn't currently available for selection.");
  }

  await prisma.courseSelection.upsert({
    where: { matchId_playerId: { matchId: data.matchId, playerId: data.playerId } },
    update: { courseId: data.courseId },
    create: data,
  });

  revalidatePublicPages();
}

export async function randomizeMatchCourse(matchId: string): Promise<{ courseId: string; courseName: string }> {
  const [selections, match] = await Promise.all([
    prisma.courseSelection.findMany({ where: { matchId } }),
    prisma.match.findUnique({ where: { id: matchId } }),
  ]);
  if (!match) throw new Error("Match not found.");
  if (match.courseId) {
    throw new Error("This match already has an official course — the draw can only run once.");
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
