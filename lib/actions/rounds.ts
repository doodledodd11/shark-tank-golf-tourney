"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { calculateRoundResult } from "@/lib/tournament-logic";

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
      { roundId, name: "Team A" },
      { roundId, name: "Team B" },
    ],
  });
  revalidateAll();
}

const rosterSchema = z.object({
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  teamAPlayerIds: z.array(z.string()),
  teamBPlayerIds: z.array(z.string()),
});

/** Replaces both teams' rosters wholesale — simpler and less error-prone
 * than diffing individual add/remove operations, and matches how an admin
 * actually thinks about a draft ("here is the final roster split"). */
export async function setRoundRosters(input: {
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

  await prisma.$transaction([
    prisma.teamMembership.deleteMany({ where: { teamId: { in: [data.teamAId, data.teamBId] } } }),
    prisma.teamMembership.createMany({
      data: [
        ...data.teamAPlayerIds.map((playerId) => ({ teamId: data.teamAId, playerId })),
        ...data.teamBPlayerIds.map((playerId) => ({ teamId: data.teamBId, playerId })),
      ],
    }),
  ]);

  revalidateAll();
  return { success: true };
}

export async function updateTeam(teamId: string, input: { name?: string; captainId?: string | null }): Promise<void> {
  await requireAdminSession();
  await prisma.team.update({
    where: { id: teamId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.captainId !== undefined ? { captainId: input.captainId } : {}),
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

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      tournament: true,
      teams: { include: { memberships: true } },
      matches: { include: { segments: true } },
    },
  });
  if (!round) return { error: "Round not found." };
  if (round.teams.length !== 2) return { error: "This round needs exactly two teams before it can be completed." };

  const [teamA, teamB] = round.teams;
  const result = calculateRoundResult({
    matches: round.matches.map((m) => ({ segments: m.segments, isPlayoff: m.isPlayoff })),
  });

  if (!result.advancing) {
    return {
      error: "The round is tied and no captain playoff result has been recorded yet. Add a playoff match first.",
    };
  }

  const advancingTeam = result.advancing === "A" ? teamA! : teamB!;
  const eliminatedTeam = result.advancing === "A" ? teamB! : teamA!;

  if (round.number === 3) {
    // Championship: advancing team's players become champions, the
    // runner-up team is eliminated (same as any other round) so nobody is
    // left showing as "Active" once the tournament is over, and the
    // tournament itself is marked complete.
    await prisma.$transaction([
      prisma.player.updateMany({
        where: { id: { in: advancingTeam.memberships.map((m) => m.playerId) } },
        data: { status: "CHAMPION" },
      }),
      prisma.player.updateMany({
        where: { id: { in: eliminatedTeam.memberships.map((m) => m.playerId) } },
        data: { status: "ELIMINATED", eliminatedRound: round.number },
      }),
      prisma.round.update({ where: { id: roundId }, data: { status: "COMPLETE" } }),
      prisma.tournament.update({ where: { id: round.tournamentId }, data: { status: "COMPLETE" } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.player.updateMany({
        where: { id: { in: eliminatedTeam.memberships.map((m) => m.playerId) } },
        data: { status: "ELIMINATED", eliminatedRound: round.number },
      }),
      prisma.round.update({ where: { id: roundId }, data: { status: "COMPLETE" } }),
    ]);
  }

  revalidateAll();
  return { success: true };
}
