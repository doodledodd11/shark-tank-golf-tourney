import { cache } from "react";
import { prisma } from "@/lib/db";

// Fallback used only if the database has no Tournament row yet (e.g. before
// the first `npm run db:seed`), so the app renders something sensible
// instead of crashing.
const FALLBACK_TOURNAMENT = {
  id: "",
  name: "Poker Club Golf Invitational",
  subtitle: "32 Players. Four Tiers. Draft Your Team. Win Your Matches. Survive.",
  season: new Date().getFullYear(),
  status: "REGISTRATION" as const,
  description: null,
  prizePoolCents: 0,
  entryFeeCents: null,
  paidPlayerCount: null,
  championshipSplitSize: 4,
  startDate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * The tournament shown on the public site. Multi-season history is
 * supported by the schema (every entity hangs off a Tournament id), but the
 * site only ever renders the one currently flagged `isActive`.
 */
export const getActiveTournament = cache(async () => {
  const tournament = await prisma.tournament.findFirst({
    where: { isActive: true },
    orderBy: { season: "desc" },
  });
  return tournament ?? FALLBACK_TOURNAMENT;
});

/** Every player ever registered for the tournament, tier order then name.
 * Eliminated/champion players stay in this list forever — see Player.status. */
export const getAllPlayers = cache(async (tournamentId: string) => {
  return prisma.player.findMany({
    where: { tournamentId },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
  });
});

export const getPlayerById = cache(async (playerId: string) => {
  return prisma.player.findUnique({ where: { id: playerId } });
});

/**
 * The full shape needed by /players and /matches: every round, with its
 * teams (+ rosters + captain), locked pairings, and matches (+ segments,
 * participants, course, and any in-flight course selections). One query
 * per page load is plenty for a field this size — no need to split this
 * into narrower fetchers.
 */
export const getRoundsWithDetails = cache(async (tournamentId: string) => {
  return prisma.round.findMany({
    where: { tournamentId },
    orderBy: { number: "asc" },
    include: {
      teams: {
        include: {
          captain: true,
          memberships: {
            include: { player: true },
            orderBy: [{ player: { tier: "asc" } }, { player: { name: "asc" } }],
          },
        },
      },
      pairings: {
        include: { player1: true, player2: true },
        orderBy: { order: "asc" },
      },
      matches: {
        include: {
          teamA: true,
          teamB: true,
          pairingA: { include: { player1: true, player2: true } },
          pairingB: { include: { player1: true, player2: true } },
          course: true,
          segments: { orderBy: { order: "asc" } },
          participants: { include: { player: true } },
          courseSelections: { include: { player: true, course: true } },
        },
        orderBy: { matchNumber: "asc" },
      },
    },
  });
});

export type RoundWithDetails = Awaited<ReturnType<typeof getRoundsWithDetails>>[number];
export type TeamWithRoster = RoundWithDetails["teams"][number];
export type PairingWithPlayers = RoundWithDetails["pairings"][number];
export type MatchWithDetails = RoundWithDetails["matches"][number];

export const getRoundWithDetails = cache(async (roundId: string) => {
  return prisma.round.findUnique({
    where: { id: roundId },
    include: {
      teams: {
        include: {
          captain: true,
          memberships: {
            include: { player: true },
            orderBy: [{ player: { tier: "asc" } }, { player: { name: "asc" } }],
          },
        },
      },
      pairings: {
        include: { player1: true, player2: true },
        orderBy: { order: "asc" },
      },
      matches: {
        include: {
          teamA: true,
          teamB: true,
          pairingA: { include: { player1: true, player2: true } },
          pairingB: { include: { player1: true, player2: true } },
          course: true,
          segments: { orderBy: { order: "asc" } },
          participants: { include: { player: true } },
          courseSelections: { include: { player: true, course: true } },
        },
        orderBy: { matchNumber: "asc" },
      },
    },
  });
});

/** Every course ever added for the tournament (admin sees all; public
 * pages filter to `active && approved` themselves). */
export const getCourses = cache(async (tournamentId: string) => {
  return prisma.course.findMany({
    where: { tournamentId },
    orderBy: { name: "asc" },
  });
});

export const getCourseById = cache(async (courseId: string) => {
  return prisma.course.findUnique({ where: { id: courseId } });
});

export const getMatchWithDetails = cache(async (matchId: string) => {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      round: true,
      teamA: true,
      teamB: true,
      pairingA: { include: { player1: true, player2: true } },
      pairingB: { include: { player1: true, player2: true } },
      course: true,
      segments: { orderBy: { order: "asc" } },
      participants: { include: { player: true } },
      courseSelections: { include: { player: true, course: true } },
    },
  });
});
