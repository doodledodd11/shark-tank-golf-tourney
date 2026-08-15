"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { TOURNAMENT_STATUSES } from "@/lib/constants";

export interface FormState {
  error?: string;
  success?: boolean;
}

const tournamentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  subtitle: z.string().min(1, "Subtitle is required"),
  description: z.string().optional(),
  status: z.enum(TOURNAMENT_STATUSES),
  season: z.coerce.number().int().min(2000).max(2100),
  prizePoolDollars: z.coerce.number().min(0),
  championshipSplitSize: z.coerce.number().int().min(1).max(32),
  startDate: z.string().optional(),
});

/** Reads an optional dollar-amount field and converts it to integer cents,
 * treating a blank input as "not set" (null) rather than coercing "" to 0
 * — entry fee and paid-player-count are allowed to stay unknown while the
 * tournament is still being planned. */
function optionalDollarsToCents(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function optionalInt(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function updateTournament(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();

  const raw = Object.fromEntries(formData.entries());
  const parsed = tournamentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  await prisma.tournament.update({
    where: { id: data.id },
    data: {
      name: data.name,
      subtitle: data.subtitle,
      description: data.description || null,
      status: data.status,
      season: data.season,
      prizePoolCents: Math.round(data.prizePoolDollars * 100),
      entryFeeCents: optionalDollarsToCents(formData, "entryFeeDollars"),
      paidPlayerCount: optionalInt(formData, "paidPlayerCount"),
      championshipSplitSize: data.championshipSplitSize,
      startDate: data.startDate ? new Date(data.startDate) : null,
    },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
