"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";

export interface FormState {
  error?: string;
  success?: boolean;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

const createSchema = z.object({
  roundId: z.string().min(1),
  teamId: z.string().min(1),
  player1Id: z.string().min(1),
  player2Id: z.string().min(1),
});

export async function createPairing(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (parsed.data.player1Id === parsed.data.player2Id) {
    return { error: "A pairing needs two different players." };
  }

  const existingCount = await prisma.pairing.count({ where: { teamId: parsed.data.teamId } });

  await prisma.pairing.create({
    data: { ...parsed.data, order: existingCount + 1, locked: true },
  });

  revalidateAll();
  return { success: true };
}

export async function deletePairing(pairingId: string): Promise<void> {
  await requireAdminSession();
  try {
    await prisma.pairing.delete({ where: { id: pairingId } });
  } catch {
    throw new Error("Can't delete a pairing that's already been matched into a match — delete the match first.");
  }
  revalidateAll();
}

export async function togglePairingLocked(pairingId: string, locked: boolean): Promise<void> {
  await requireAdminSession();
  await prisma.pairing.update({ where: { id: pairingId }, data: { locked } });
  revalidateAll();
}
