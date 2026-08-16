"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { completeRoundLogic } from "@/lib/round-completion";
import { setRoundRostersLogic } from "@/lib/round-roster";

export interface FormState {
  error?: string;
  success?: boolean;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Creates the (initially empty) Team A / Team B rows for a round, so the
 * roster-assignment tool has something to assign players onto. Safe to
 * call more than once — it's a no-op if teams already exist. */
export async function initializeRoundTeams(roundId: string): Promise<void> {
  await requireAdminSession();
  const existing = await prisma.team.findMany({ where: { roundId } });
  if (existing.length > 0) return;

  await prisma.team.createMany({
    data: [
      { roundId, name: "Team A", order: 0 },
      { roundId, name: "Team B", order: 1 },
    ],
  });
  revalidateAll();
}

export async function setRoundRosters(input: {
  roundId: string;
  teamAId: string;
  teamBId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
}): Promise<FormState> {
  await requireAdminSession();
  const result = await setRoundRostersLogic(input);
  if (result.success) revalidateAll();
  return result;
}

/** Single-player version of the same move, for the Players page (which
 * knows a player's *current* team but not the rest of both rosters) —
 * computes the resulting two rosters and reuses setRoundRostersLogic so it
 * gets the exact same stale-pairing guard as the round page's tool. */
export async function movePlayerToOtherTeam(input: {
  playerId: string;
  roundId: string;
  fromTeamId: string;
  toTeamId: string;
}): Promise<FormState> {
  await requireAdminSession();
  const [fromTeam, toTeam] = await Promise.all([
    prisma.team.findUnique({ where: { id: input.fromTeamId }, include: { memberships: true } }),
    prisma.team.findUnique({ where: { id: input.toTeamId }, include: { memberships: true } }),
  ]);
  if (!fromTeam || !toTeam || fromTeam.roundId !== input.roundId || toTeam.roundId !== input.roundId) {
    return { error: "Couldn't find that round's teams." };
  }
  if (!fromTeam.memberships.some((m) => m.playerId === input.playerId)) {
    return { error: "That player isn't currently on that team." };
  }

  const result = await setRoundRostersLogic({
    roundId: input.roundId,
    teamAId: input.fromTeamId,
    teamBId: input.toTeamId,
    teamAPlayerIds: fromTeam.memberships.map((m) => m.playerId).filter((id) => id !== input.playerId),
    teamBPlayerIds: [...toTeam.memberships.map((m) => m.playerId), input.playerId],
  });
  if (result.success) revalidateAll();
  return result;
}

const updateTeamSchema = z.object({
  name: z.string().trim().min(1).optional(),
  captainId: z.string().min(1).nullable().optional(),
});

export async function updateTeam(teamId: string, input: { name?: string; captainId?: string | null }): Promise<void> {
  await requireAdminSession();
  const data = updateTeamSchema.parse(input);
  await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.captainId !== undefined ? { captainId: data.captainId } : {}),
    },
  });
  revalidateAll();
}

export async function activateRound(roundId: string): Promise<void> {
  await requireAdminSession();
  await prisma.round.update({ where: { id: roundId }, data: { status: "ACTIVE" } });
  revalidateAll();
}

export async function updateRoundDeadline(roundId: string, deadline: string): Promise<void> {
  await requireAdminSession();
  await prisma.round.update({
    where: { id: roundId },
    data: { deadline: deadline ? new Date(deadline) : null },
  });
  revalidateAll();
}

/**
 * Finalizes a round: determines the advancing side from its matches (via
 * the same pure calculateRoundResult used across the app), marks the
 * losing side's players ELIMINATED (or, for the championship, marks the
 * winning side's 4 players CHAMPION and closes out the tournament).
 * Refuses to run if the round is tied with no playoff match recorded yet.
 */
export async function completeRound(roundId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await completeRoundLogic(roundId);
  if (result.success) revalidateAll();
  return result;
}
