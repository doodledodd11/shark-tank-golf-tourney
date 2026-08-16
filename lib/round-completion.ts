// Core round-completion logic, deliberately kept free of Next.js
// request-scoped calls (cookies-based auth, revalidatePath) so it can be
// exercised directly from tests without a request context. The exported
// Server Action `completeRound` in lib/actions/rounds.ts is the only
// intended caller in the running app — it adds the admin-session check and
// cache revalidation around this. This function performs no authorization
// of its own and must never be re-exported from a "use server" file, or it
// would become a publicly invocable, unauthenticated Server Action.

import { prisma } from "@/lib/db";
import { calculateRoundResult } from "@/lib/tournament-logic";

export interface FormState {
  error?: string;
  success?: boolean;
}

/**
 * Determines the advancing side from a round's matches (via the same pure
 * calculateRoundResult used across the app), marks the losing side's
 * players ELIMINATED (or, for the championship, marks the winning side's 4
 * players CHAMPION and closes out the tournament). Refuses to run if the
 * round is tied with no playoff match recorded yet.
 */
export async function completeRoundLogic(roundId: string): Promise<FormState> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      tournament: true,
      teams: { orderBy: { order: "asc" }, include: { memberships: true } },
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

  return { success: true };
}
