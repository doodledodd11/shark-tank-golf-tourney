"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/dal";
import {
  ensureCaptainAccessTokensLogic,
  getTwosomeLockBoardData,
  lockTwosomeLogic,
  deleteTwosomeLogic,
  resetTwosomeLockLogic,
  getMatchmakingBoardData,
  announcePairingLogic,
  respondToPairingLogic,
  cancelMatchmakingLogic,
  type FormState,
  type TwosomeLockBoardData,
  type MatchmakingBoardData,
} from "@/lib/matchmaking";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function ensureCaptainAccessTokens(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await ensureCaptainAccessTokensLogic(roundId);
  if (result.success) revalidateAll();
  return result;
}

export async function resetTwosomeLock(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await resetTwosomeLockLogic(roundId);
  if (result.success) revalidateAll();
  return result;
}

export async function cancelMatchmaking(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await cancelMatchmakingLogic(roundId);
  if (result.success) revalidateAll();
  return result;
}

// The rest are deliberately public / unauthenticated — same reasoning as
// submitDraftPick in lib/actions/draft.ts: a captain isn't an admin, and
// their only credential is the per-team token, checked inside each logic
// function itself.

export async function getTwosomeLockBoard(roundId: string, captainToken: string): Promise<TwosomeLockBoardData | null> {
  return getTwosomeLockBoardData(roundId, captainToken);
}

const lockTwosomeSchema = z.object({
  roundId: z.string().min(1),
  captainToken: z.string().min(1),
  player1Id: z.string().min(1),
  player2Id: z.string().min(1),
});

export async function lockTwosome(input: { roundId: string; captainToken: string; player1Id: string; player2Id: string }): Promise<FormState> {
  const data = lockTwosomeSchema.parse(input);
  const result = await lockTwosomeLogic(data);
  if (result.success) revalidateAll();
  return result;
}

const deleteTwosomeSchema = z.object({
  roundId: z.string().min(1),
  captainToken: z.string().min(1),
  pairingId: z.string().min(1),
});

export async function deleteTwosome(input: { roundId: string; captainToken: string; pairingId: string }): Promise<FormState> {
  const data = deleteTwosomeSchema.parse(input);
  const result = await deleteTwosomeLogic(data);
  if (result.success) revalidateAll();
  return result;
}

export async function getMatchmakingBoard(roundId: string, captainToken?: string | null): Promise<MatchmakingBoardData | null> {
  return getMatchmakingBoardData(roundId, captainToken);
}

const pairingActionSchema = z.object({
  roundId: z.string().min(1),
  captainToken: z.string().min(1),
  pairingId: z.string().min(1),
});

export async function announcePairing(input: { roundId: string; captainToken: string; pairingId: string }): Promise<FormState> {
  const data = pairingActionSchema.parse(input);
  const result = await announcePairingLogic(data);
  if (result.success) revalidateAll();
  return result;
}

export async function respondToPairing(input: { roundId: string; captainToken: string; pairingId: string }): Promise<FormState> {
  const data = pairingActionSchema.parse(input);
  const result = await respondToPairingLogic(data);
  if (result.success) revalidateAll();
  return result;
}
