"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/dal";
import {
  startDraftLogic,
  submitDraftPickLogic,
  cancelDraftLogic,
  getDraftBoardData,
  type FormState,
  type DraftBoardData,
} from "@/lib/draft";

function revalidateAll() {
  revalidatePath("/", "layout");
}

const startDraftSchema = z.object({
  roundId: z.string().min(1),
  captainAPlayerId: z.string().min(1),
  captainBPlayerId: z.string().min(1),
});

export async function startDraft(input: {
  roundId: string;
  captainAPlayerId: string;
  captainBPlayerId: string;
}): Promise<FormState & { tokens?: { teamAToken: string; teamBToken: string } }> {
  await requireAdminSession();
  const data = startDraftSchema.parse(input);
  const result = await startDraftLogic(data);
  if (result.success) revalidateAll();
  return result;
}

export async function cancelDraft(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await cancelDraftLogic(roundId);
  if (result.success) revalidateAll();
  return result;
}

const submitPickSchema = z.object({
  roundId: z.string().min(1),
  captainToken: z.string().min(1),
  playerId: z.string().min(1),
});

// Deliberately public, no requireAdminSession — see lib/draft.ts's file
// header. A captain isn't an admin; their only credential is the per-team
// token, which submitDraftPickLogic itself checks.
export async function submitDraftPick(input: { roundId: string; captainToken: string; playerId: string }): Promise<FormState> {
  const data = submitPickSchema.parse(input);
  const result = await submitDraftPickLogic(data);
  if (result.success) revalidateAll();
  return result;
}

// Also public and unauthenticated, on purpose: this is what the client-side
// polling on the draft board calls. Server Components fetch the same data
// directly from lib/draft.ts instead of going through this — this wrapper
// exists only because a Client Component can't import a server-only module.
export async function getDraftBoard(roundId: string, captainToken?: string | null): Promise<DraftBoardData | null> {
  return getDraftBoardData(roundId, captainToken);
}
