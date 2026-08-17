"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { MATCH_STATUSES } from "@/lib/constants";
import { SEGMENT_TEMPLATES } from "@/lib/segment-templates";

export interface FormState {
  error?: string;
  success?: boolean;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const s = value == null ? "" : String(value).trim();
  return s === "" ? null : s;
}

async function nextMatchNumber(roundId: string): Promise<number> {
  const count = await prisma.match.count({ where: { roundId } });
  return count + 1;
}

/** A player already scheduled in another match this round, if any — the
 * guard against a stale pairing or a "Pick Players" mis-click putting
 * someone in two matches at once, which would silently double-count their
 * result in the round's point totals (and whichever elimination decision
 * those totals drive). Returns the player's name for the error message,
 * or null if the whole set is clear. */
async function findDoubleBookedPlayer(roundId: string, playerIds: string[]): Promise<string | null> {
  const existing = await prisma.matchParticipant.findFirst({
    where: { playerId: { in: playerIds }, match: { roundId } },
    include: { player: true },
  });
  return existing?.player.name ?? null;
}

const fromPairingsSchema = z.object({
  roundId: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  pairingAId: z.string().min(1),
  pairingBId: z.string().min(1),
  template: z.enum(["ROUND_1", "ROUND_2"]),
});

/** Builds a 2v2 match from two already-locked pairings — the Round 1 / Round 2 flow. */
export async function createMatchFromPairings(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const parsed = fromPairingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const [pairingA, pairingB] = await Promise.all([
    prisma.pairing.findUnique({ where: { id: data.pairingAId } }),
    prisma.pairing.findUnique({ where: { id: data.pairingBId } }),
  ]);
  if (!pairingA || !pairingB) return { error: "Twosome not found." };

  const doubleBooked = await findDoubleBookedPlayer(data.roundId, [
    pairingA.player1Id,
    pairingA.player2Id,
    pairingB.player1Id,
    pairingB.player2Id,
  ]);
  if (doubleBooked) return { error: `${doubleBooked} is already in another match this round.` };

  const matchNumber = await nextMatchNumber(data.roundId);
  const segments = SEGMENT_TEMPLATES[data.template];

  await prisma.match.create({
    data: {
      roundId: data.roundId,
      matchNumber,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      pairingAId: pairingA.id,
      pairingBId: pairingB.id,
      // By the time a Match row exists, its four players are already
      // determined — "Twosome Pending" (the schema default's label) doesn't
      // apply here. The next real step is agreeing on a course.
      status: "COURSE_SELECTION",
      participants: {
        create: [
          { playerId: pairingA.player1Id, side: "A" },
          { playerId: pairingA.player2Id, side: "A" },
          { playerId: pairingB.player1Id, side: "B" },
          { playerId: pairingB.player2Id, side: "B" },
        ],
      },
      segments: { create: segments },
    },
  });

  revalidateAll();
  return { success: true };
}

const fromPlayersSchema = z.object({
  roundId: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  template: z.enum(["CHAMPIONSHIP_TEAM", "CHAMPIONSHIP_SINGLES", "PLAYOFF", "SUDDEN_DEATH"]),
  isPlayoff: z.string().optional(),
});

/** Builds a match directly from individually-selected players — used for
 * the championship (team matches, singles, sudden death) and captain
 * playoffs, where a locked Pairing doesn't apply the same way it does in
 * Round 1 / Round 2. */
export async function createMatchFromPlayers(formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const parsed = fromPlayersSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  const sideAIds = formData.getAll("sideAPlayerIds").map(String).filter(Boolean);
  const sideBIds = formData.getAll("sideBPlayerIds").map(String).filter(Boolean);
  if (sideAIds.length === 0 || sideBIds.length === 0) {
    return { error: "Select at least one player for each side." };
  }
  if (sideAIds.length !== sideBIds.length) {
    return { error: "Both sides need the same number of players." };
  }

  const doubleBooked = await findDoubleBookedPlayer(data.roundId, [...sideAIds, ...sideBIds]);
  if (doubleBooked) return { error: `${doubleBooked} is already in another match this round.` };

  const matchNumber = await nextMatchNumber(data.roundId);
  const segments = SEGMENT_TEMPLATES[data.template];

  await prisma.match.create({
    data: {
      roundId: data.roundId,
      matchNumber,
      teamAId: data.teamAId,
      teamBId: data.teamBId,
      isPlayoff: data.template === "PLAYOFF" || data.template === "SUDDEN_DEATH",
      status: "COURSE_SELECTION",
      participants: {
        create: [
          ...sideAIds.map((playerId) => ({ playerId, side: "A" })),
          ...sideBIds.map((playerId) => ({ playerId, side: "B" })),
        ],
      },
      segments: { create: segments },
    },
  });

  revalidateAll();
  return { success: true };
}

export async function deleteMatch(matchId: string): Promise<void> {
  await requireAdminSession();
  await prisma.match.delete({ where: { id: matchId } });
  revalidateAll();
}

// Rendered directly as an <a href> (the "Follow Match Live" button) — see
// the matching comment in lib/actions/courses.ts for why these are
// restricted to http/https rather than accepting any string.
const linkSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Links must start with http:// or https://")
  .optional();

const updateMatchSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().optional(),
  scheduledDate: z.string().optional(),
  status: z.enum(MATCH_STATUSES),
  gameBookEventUrl: linkSchema,
  gameBookLeaderboardUrl: linkSchema,
  externalScoringUrl: linkSchema,
  notes: z.string().optional(),
});

export async function updateMatchDetails(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const parsed = updateMatchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  await prisma.match.update({
    where: { id: data.id },
    data: {
      courseId: optionalText(formData.get("courseId")),
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      status: data.status,
      gameBookEventUrl: data.gameBookEventUrl || null,
      gameBookLeaderboardUrl: data.gameBookLeaderboardUrl || null,
      externalScoringUrl: data.externalScoringUrl || null,
      notes: optionalText(formData.get("notes")),
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

const updateSegmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  format: z.string().min(1),
  holes: z.string().optional(),
  pointsAvailable: z.coerce.number().min(0),
  winner: z.enum(["", "A", "B", "TIE"]),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETE"]),
});

export async function updateSegment(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const parsed = updateSegmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const data = parsed.data;

  function optionalFloat(value: FormDataEntryValue | null): number | null {
    const s = value == null ? "" : String(value).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  await prisma.matchSegment.update({
    where: { id: data.id },
    data: {
      name: data.name,
      format: data.format,
      holes: optionalText(formData.get("holes")),
      pointsAvailable: data.pointsAvailable,
      winner: data.winner === "" ? null : data.winner,
      status: data.status,
      teamAScore: optionalFloat(formData.get("teamAScore")),
      teamBScore: optionalFloat(formData.get("teamBScore")),
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function addSegment(matchId: string): Promise<void> {
  await requireAdminSession();
  const count = await prisma.matchSegment.count({ where: { matchId } });
  await prisma.matchSegment.create({
    data: {
      matchId,
      name: `Segment ${count + 1}`,
      format: "SINGLES",
      order: count + 1,
      pointsAvailable: 1,
      status: "PENDING",
    },
  });
  revalidatePath("/", "layout");
}

export async function deleteSegment(segmentId: string): Promise<void> {
  await requireAdminSession();
  await prisma.matchSegment.delete({ where: { id: segmentId } });
  revalidatePath("/", "layout");
}
