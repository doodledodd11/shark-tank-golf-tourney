"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
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
