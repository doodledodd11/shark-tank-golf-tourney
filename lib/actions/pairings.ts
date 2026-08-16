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
  // Match.pairingAId/pairingBId are ON DELETE SET NULL (so that deleting a
  // match doesn't cascade into deleting the pairing it used) — which means
  // Postgres will *not* stop this delete on its own if a match still
  // references this pairing; it would just silently null the match out
  // from under itself. So the guard has to happen here, explicitly.
  const referencingMatch = await prisma.match.findFirst({
    where: { OR: [{ pairingAId: pairingId }, { pairingBId: pairingId }] },
  });
  if (referencingMatch) {
    throw new Error("Can't delete a pairing that's already been matched into a match — delete the match first.");
  }
  await prisma.pairing.delete({ where: { id: pairingId } });
  revalidateAll();
}

export async function togglePairingLocked(pairingId: string, locked: boolean): Promise<void> {
  await requireAdminSession();
  await prisma.pairing.update({ where: { id: pairingId }, data: { locked } });
  revalidateAll();
}
