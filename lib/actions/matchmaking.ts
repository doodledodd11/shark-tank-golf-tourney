"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/dal";
import {
  ensureCaptainAccessTokensLogic,
  setFirstAnnouncerLogic,
  getTwosomeLockBoardData,
  lockTwosomeLogic,
  deleteTwosomeLogic,
  resetTwosomeLockLogic,
  getMatchmakingBoardData,
  announcePairingLogic,
  respondToPairingLogic,
  cancelMatchmakingLogic,
  randomizeChampionshipTeamMatchupsLogic,
  getSinglesMatchmakingBoardData,
  announceSinglesLogic,
  respondToSinglesLogic,
  cancelSinglesMatchmakingLogic,
  type FormState,
  type TwosomeLockBoardData,
  type MatchmakingBoardData,
  type SinglesMatchmakingBoardData,
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

export async function setFirstAnnouncer(roundId: string, teamId: string | null): Promise<FormState> {
  await requireAdminSession();
  const result = await setFirstAnnouncerLogic(roundId, teamId);
  if (result.success) revalidateAll();
  return result;
}

export async function randomizeChampionshipTeamMatchups(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await randomizeChampionshipTeamMatchupsLogic(roundId);
  if (result.success) revalidateAll();
  return result;
}

export async function cancelSinglesMatchmaking(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await cancelSinglesMatchmakingLogic(roundId);
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

export async function getSinglesMatchmakingBoard(roundId: string, captainToken?: string | null): Promise<SinglesMatchmakingBoardData | null> {
  return getSinglesMatchmakingBoardData(roundId, captainToken);
}

const singlesActionSchema = z.object({
  roundId: z.string().min(1),
  captainToken: z.string().min(1),
  playerId: z.string().min(1),
});

export async function announceSingles(input: { roundId: string; captainToken: string; playerId: string }): Promise<FormState> {
  const data = singlesActionSchema.parse(input);
  const result = await announceSinglesLogic(data);
  if (result.success) revalidateAll();
  return result;
}

export async function respondToSingles(input: { roundId: string; captainToken: string; playerId: string }): Promise<FormState> {
  const data = singlesActionSchema.parse(input);
  const result = await respondToSinglesLogic(data);
  if (result.success) revalidateAll();
  return result;
}
