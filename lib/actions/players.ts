"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { getActiveTournament } from "@/lib/data";
import { isRateLimited } from "@/lib/rate-limit";
import { PLAYER_STATUSES } from "@/lib/constants";

export interface FormState {
  error?: string;
  success?: boolean;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const s = value == null ? "" : String(value).trim();
  return s === "" ? null : s;
}

function optionalFloat(value: FormDataEntryValue | null): number | null {
  const s = value == null ? "" : String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const createSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  tier: z.coerce.number().int().min(1).max(4),
});

export async function createPlayer(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();

  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await prisma.player.create({
    data: {
      tournamentId: parsed.data.tournamentId,
      name: parsed.data.name,
      tier: parsed.data.tier,
      hometown: optionalText(formData.get("hometown")),
      handicapIndex: optionalFloat(formData.get("handicapIndex")),
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  tier: z.coerce.number().int().min(1).max(4),
  status: z.enum(PLAYER_STATUSES),
});

export async function updatePlayer(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();

  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const eliminatedRound =
    parsed.data.status === "ELIMINATED" ? (optionalFloat(formData.get("eliminatedRound")) ?? null) : null;

  await prisma.player.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      tier: parsed.data.tier,
      status: parsed.data.status,
      eliminatedRound: eliminatedRound != null ? Math.trunc(eliminatedRound) : null,
      hometown: optionalText(formData.get("hometown")),
      handicapIndex: optionalFloat(formData.get("handicapIndex")),
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function deletePlayer(playerId: string): Promise<void> {
  await requireAdminSession();
  // The admin UI only shows the delete button during Registration (before
  // a player could be on any team/pairing/match) — but that's a page-level
  // gate, not enforcement, and this action is directly POST-able. Check it
  // here too, matching the same "checks close to the data" reasoning the
  // rest of the admin actions already follow.
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { tournament: true } });
  if (!player) return;
  if (player.tournament.status !== "REGISTRATION") {
    throw new Error("Players can only be removed while the tournament is still in Registration.");
  }
  await prisma.player.delete({ where: { id: playerId } });
  revalidatePath("/", "layout");
}

const joinSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "That name's too long"),
  tier: z.coerce.number().int().min(1).max(4),
});

const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4MB

/** Validates and uploads an optional photo from the join form. Returns the
 * blob URL, null if no photo was attached, or an error to short-circuit
 * the whole submission on — a rejected photo shouldn't silently create a
 * photo-less player instead of telling the submitter why. */
async function handleJoinPhoto(formData: FormData): Promise<{ url: string | null; error?: string }> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { url: null };

  const extension = ALLOWED_PHOTO_TYPES[photo.type];
  if (!extension) {
    return { url: null, error: "Photo must be a JPEG, PNG, or WebP image." };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { url: null, error: "Photo is too large. 4MB max." };
  }

  try {
    const blob = await put(`player-photos/${crypto.randomUUID()}.${extension}`, photo, {
      access: "public",
      contentType: photo.type,
    });
    return { url: blob.url };
  } catch {
    return { url: null, error: "Couldn't upload that photo. Try again, or join without one." };
  }
}

// Deliberately public — the whole point is that players add themselves
// instead of the admin typing in 32 profiles by hand. No accounts, no
// login: anyone can submit a name while the tournament is in Registration.
// The admin reviews /admin/players afterward and deletes anything bogus,
// same as they'd clean up a paper sign-up sheet.
export async function joinTournament(_prevState: FormState, formData: FormData): Promise<FormState> {
  const clientIp = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(`join:${clientIp}`)) {
    return { error: "Too many attempts. Wait a few minutes and try again." };
  }

  const parsed = joinSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // Re-checked here, not just on the page that renders the form — the
  // window between page load and submit is exactly when an admin closing
  // Registration would otherwise let a late entry slip through.
  const tournament = await getActiveTournament();
  if (!tournament.id) {
    return { error: "There's no active tournament to join right now." };
  }
  if (tournament.status !== "REGISTRATION") {
    return { error: "Registration is closed. The field is already set for this tournament." };
  }

  const photo = await handleJoinPhoto(formData);
  if (photo.error) {
    return { error: photo.error };
  }

  await prisma.player.create({
    data: {
      tournamentId: tournament.id,
      name: parsed.data.name,
      tier: parsed.data.tier,
      hometown: optionalText(formData.get("hometown")),
      handicapIndex: optionalFloat(formData.get("handicapIndex")),
      avatarUrl: photo.url,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
