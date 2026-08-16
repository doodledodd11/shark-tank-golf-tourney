"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { completeRoundLogic } from "@/lib/round-completion";

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

const nonEmptyIdArray = z.array(z.string().min(1));

const rosterSchema = z.object({
  roundId: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  teamAPlayerIds: nonEmptyIdArray,
  teamBPlayerIds: nonEmptyIdArray,
});

/** Replaces both teams' rosters wholesale — simpler and less error-prone
 * than diffing individual add/remove operations, and matches how an admin
 * actually thinks about a draft ("here is the final roster split"). */
export async function setRoundRosters(input: {
  roundId: string;
  teamAId: string;
  teamBId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
}): Promise<FormState> {
  await requireAdminSession();
  const data = rosterSchema.parse(input);

  const overlap = data.teamAPlayerIds.filter((id) => data.teamBPlayerIds.includes(id));
  if (overlap.length > 0) {
    return { error: "A player can't be on both teams." };
  }
  const newRosterIds = new Set([...data.teamAPlayerIds, ...data.teamBPlayerIds]);

  // A re-drafted roster can strand pairings that named a player no longer
  // on either team — clean those up so they don't sit around and later get
  // matched against an opponent, putting that player in two matches for
  // the round. Pairings already committed to a match are left alone; those
  // need an explicit delete (which itself blocks while the match exists).
  const staleCandidates = await prisma.pairing.findMany({
    where: { roundId: data.roundId },
    include: { matchesAsPairingA: { select: { id: true } }, matchesAsPairingB: { select: { id: true } } },
  });
  const stalePairingIds = staleCandidates
    .filter((p) => !newRosterIds.has(p.player1Id) || !newRosterIds.has(p.player2Id))
    .filter((p) => p.matchesAsPairingA.length === 0 && p.matchesAsPairingB.length === 0)
    .map((p) => p.id);

  await prisma.$transaction([
    prisma.teamMembership.deleteMany({ where: { teamId: { in: [data.teamAId, data.teamBId] } } }),
    prisma.teamMembership.createMany({
      data: [
        ...data.teamAPlayerIds.map((playerId) => ({ teamId: data.teamAId, playerId })),
        ...data.teamBPlayerIds.map((playerId) => ({ teamId: data.teamBId, playerId })),
      ],
    }),
    ...(stalePairingIds.length > 0 ? [prisma.pairing.deleteMany({ where: { id: { in: stalePairingIds } } })] : []),
  ]);

  revalidateAll();
  return { success: true };
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
