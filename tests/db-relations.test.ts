// Integration tests against the real Postgres database (the Neon
// "development" branch — see .env) — these guard the relational invariants
// the tournament format depends on, which the pure-function tests in
// tournament-logic.test.ts can't see: round-scoped rosters, redraftability,
// elimination history, and pairing/round/team scoping.
//
// This assumes migrations have already been applied to the target database
// (`npm run db:migrate`), same as any normal `npm run dev` session — tests
// don't push their own schema. Every tournament created here uses the
// unmistakable marker `season: 2099`, which is exactly what afterAll
// deletes (cascading through every table via the schema's onDelete rules),
// so nothing lingers in the shared dev database between runs.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { completeRoundLogic } from "@/lib/round-completion";
import { setRoundRostersLogic } from "@/lib/round-roster";

const TEST_SEASON = 2099;
const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.tournament.deleteMany({ where: { season: TEST_SEASON } });
  await prisma.$disconnect();
});

async function makeTournament() {
  return prisma.tournament.create({ data: { name: "Test Cup", season: TEST_SEASON } });
}

describe("team membership is round-specific and redraftable", () => {
  it("lets the same player belong to different teams in different rounds", async () => {
    const tournament = await makeTournament();
    const player = await prisma.player.create({ data: { tournamentId: tournament.id, name: "Redraft Test", tier: 1 } });

    const round1 = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 1, name: "Round 1", playersStart: 32, playersAdvance: 16 },
    });
    const round2 = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 2, name: "Round 2", playersStart: 16, playersAdvance: 8 },
    });

    const round1TeamA = await prisma.team.create({ data: { roundId: round1.id, name: "Team A" } });
    const round2TeamB = await prisma.team.create({ data: { roundId: round2.id, name: "Team B" } });

    await prisma.teamMembership.create({ data: { teamId: round1TeamA.id, playerId: player.id } });
    await prisma.teamMembership.create({ data: { teamId: round2TeamB.id, playerId: player.id } });

    const memberships = await prisma.teamMembership.findMany({
      where: { playerId: player.id },
      include: { team: true },
    });

    expect(memberships).toHaveLength(2);
    const teamIds = memberships.map((m) => m.team.id).sort();
    expect(teamIds).toEqual([round1TeamA.id, round2TeamB.id].sort());
    // Different team rows in different rounds — not the same roster carried over.
    expect(memberships[0]!.team.roundId).not.toBe(memberships[1]!.team.roundId);
  });

  it("scopes a round's roster query to only that round's teams", async () => {
    const tournament = await makeTournament();
    const [playerA, playerB] = await Promise.all([
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Scoped A", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Scoped B", tier: 1 } }),
    ]);
    const round1 = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 1, name: "Round 1", playersStart: 32, playersAdvance: 16 },
    });
    const round2 = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 2, name: "Round 2", playersStart: 16, playersAdvance: 8 },
    });
    const round1Team = await prisma.team.create({ data: { roundId: round1.id, name: "Team A" } });
    const round2Team = await prisma.team.create({ data: { roundId: round2.id, name: "Team A" } });
    await prisma.teamMembership.create({ data: { teamId: round1Team.id, playerId: playerA.id } });
    await prisma.teamMembership.create({ data: { teamId: round2Team.id, playerId: playerB.id } });

    const round1Roster = await prisma.teamMembership.findMany({ where: { team: { roundId: round1.id } } });
    const round2Roster = await prisma.teamMembership.findMany({ where: { team: { roundId: round2.id } } });

    expect(round1Roster.map((m) => m.playerId)).toEqual([playerA.id]);
    expect(round2Roster.map((m) => m.playerId)).toEqual([playerB.id]);
  });
});

describe("eliminated players remain in history", () => {
  it("keeps an eliminated player's row queryable with its elimination round recorded", async () => {
    const tournament = await makeTournament();
    const player = await prisma.player.create({
      data: { tournamentId: tournament.id, name: "Eliminated Test", tier: 2, status: "ELIMINATED", eliminatedRound: 1 },
    });

    const all = await prisma.player.findMany({ where: { tournamentId: tournament.id } });
    const found = all.find((p) => p.id === player.id);

    expect(found).toBeDefined();
    expect(found?.status).toBe("ELIMINATED");
    expect(found?.eliminatedRound).toBe(1);
  });

  it("represents champion status alongside eliminated runners-up after the championship", async () => {
    const tournament = await makeTournament();
    const champion = await prisma.player.create({
      data: { tournamentId: tournament.id, name: "Champ Test", tier: 1, status: "CHAMPION" },
    });
    const runnerUp = await prisma.player.create({
      data: { tournamentId: tournament.id, name: "Runner Up Test", tier: 1, status: "ELIMINATED", eliminatedRound: 3 },
    });

    const champions = await prisma.player.findMany({ where: { tournamentId: tournament.id, status: "CHAMPION" } });
    expect(champions.map((p) => p.id)).toEqual([champion.id]);

    const stillQueryable = await prisma.player.findUnique({ where: { id: runnerUp.id } });
    expect(stillQueryable?.status).toBe("ELIMINATED");
  });
});

describe("pairings belong to the correct team and round", () => {
  it("scopes a pairing to the team and round it was created under", async () => {
    const tournament = await makeTournament();
    const [p1, p2, p3] = await Promise.all([
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Pair 1", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Pair 2", tier: 4 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Pair 3", tier: 2 } }),
    ]);
    const round1 = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 1, name: "Round 1", playersStart: 32, playersAdvance: 16 },
    });
    const round2 = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 2, name: "Round 2", playersStart: 16, playersAdvance: 8 },
    });
    const teamA = await prisma.team.create({ data: { roundId: round1.id, name: "Team A" } });

    const pairing = await prisma.pairing.create({
      data: { roundId: round1.id, teamId: teamA.id, player1Id: p1.id, player2Id: p2.id, order: 1, locked: true },
    });
    // A pairing for a different round, sharing a player pool, to prove scoping.
    const otherTeam = await prisma.team.create({ data: { roundId: round2.id, name: "Team A" } });
    await prisma.pairing.create({
      data: { roundId: round2.id, teamId: otherTeam.id, player1Id: p3.id, player2Id: p1.id, order: 1, locked: true },
    });

    expect(pairing.roundId).toBe(round1.id);
    expect(pairing.teamId).toBe(teamA.id);

    const round1Pairings = await prisma.pairing.findMany({ where: { roundId: round1.id } });
    expect(round1Pairings.map((p) => p.id)).toEqual([pairing.id]);

    const teamAPairings = await prisma.pairing.findMany({ where: { teamId: teamA.id } });
    expect(teamAPairings).toHaveLength(1);
  });
});

describe("completeRoundLogic", () => {
  // "A"/"B" for scoring purposes is entirely positional: round.teams
  // ordered by `order asc` (round.teams[0] is "A", [1] is "B"), regardless
  // of a Match's own teamAId/teamBId (cosmetic/display only — completeRoundLogic
  // never reads them) or of row-insertion order. So team "A" is deliberately
  // created *second* here — a regression that drops the
  // `orderBy: { order: "asc" }` on the teams query would fall back to
  // insertion order and misattribute status to the wrong team.
  async function makeRoundWithDecidedMatch(roundNumber: number, winner: "A" | "B") {
    const tournament = await makeTournament();
    const round = await prisma.round.create({
      data: {
        tournamentId: tournament.id,
        number: roundNumber,
        name: roundNumber === 3 ? "Championship" : `Round ${roundNumber}`,
        playersStart: 8,
        playersAdvance: 4,
      },
    });

    const teamB = await prisma.team.create({ data: { roundId: round.id, name: "Team B", order: 1 } });
    const teamA = await prisma.team.create({ data: { roundId: round.id, name: "Team A", order: 0 } });
    const winningTeam = winner === "A" ? teamA : teamB;
    const losingTeam = winner === "A" ? teamB : teamA;

    const [p1, p2, p3, p4] = await Promise.all([
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Winner 1", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Winner 2", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Loser 1", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Loser 2", tier: 1 } }),
    ]);
    await prisma.teamMembership.createMany({
      data: [
        { teamId: winningTeam.id, playerId: p1.id },
        { teamId: winningTeam.id, playerId: p2.id },
        { teamId: losingTeam.id, playerId: p3.id },
        { teamId: losingTeam.id, playerId: p4.id },
      ],
    });

    const match = await prisma.match.create({
      data: { roundId: round.id, matchNumber: 1, teamAId: teamA.id, teamBId: teamB.id },
    });
    await prisma.matchSegment.create({
      data: { matchId: match.id, name: "Overall 18", format: "SCRAMBLE", pointsAvailable: 1, winner },
    });

    return { tournament, round, winningPlayerIds: [p1.id, p2.id], losingPlayerIds: [p3.id, p4.id] };
  }

  it("eliminates the losing side and leaves the winning side active, for a normal round", async () => {
    const { tournament, round, winningPlayerIds, losingPlayerIds } = await makeRoundWithDecidedMatch(1, "B");

    const result = await completeRoundLogic(round.id);
    expect(result).toEqual({ success: true });

    const updatedRound = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(updatedRound.status).toBe("COMPLETE");

    const unchangedTournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id } });
    expect(unchangedTournament.status).toBe("REGISTRATION");

    const winners = await prisma.player.findMany({ where: { id: { in: winningPlayerIds } } });
    for (const p of winners) {
      expect(p.status).toBe("ACTIVE");
      expect(p.eliminatedRound).toBeNull();
    }

    const losers = await prisma.player.findMany({ where: { id: { in: losingPlayerIds } } });
    for (const p of losers) {
      expect(p.status).toBe("ELIMINATED");
      expect(p.eliminatedRound).toBe(1);
    }
  });

  it("crowns the winning side champion and eliminates the runner-up, for the championship round", async () => {
    const { tournament, round, winningPlayerIds, losingPlayerIds } = await makeRoundWithDecidedMatch(3, "A");

    const result = await completeRoundLogic(round.id);
    expect(result).toEqual({ success: true });

    const updatedRound = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(updatedRound.status).toBe("COMPLETE");

    const completedTournament = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id } });
    expect(completedTournament.status).toBe("COMPLETE");

    const champions = await prisma.player.findMany({ where: { id: { in: winningPlayerIds } } });
    for (const p of champions) {
      expect(p.status).toBe("CHAMPION");
    }

    const runnersUp = await prisma.player.findMany({ where: { id: { in: losingPlayerIds } } });
    for (const p of runnersUp) {
      expect(p.status).toBe("ELIMINATED");
      expect(p.eliminatedRound).toBe(3);
    }
  });

  it("refuses to complete a tied round with no playoff match recorded", async () => {
    const tournament = await makeTournament();
    const round = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 1, name: "Round 1", playersStart: 8, playersAdvance: 4 },
    });
    const teamA = await prisma.team.create({ data: { roundId: round.id, name: "Team A", order: 0 } });
    const teamB = await prisma.team.create({ data: { roundId: round.id, name: "Team B", order: 1 } });
    const match = await prisma.match.create({
      data: { roundId: round.id, matchNumber: 1, teamAId: teamA.id, teamBId: teamB.id },
    });
    await prisma.matchSegment.create({
      data: { matchId: match.id, name: "Overall 18", format: "SCRAMBLE", pointsAvailable: 1, winner: "TIE" },
    });

    const result = await completeRoundLogic(round.id);
    expect(result.error).toBeTruthy();

    const unchangedRound = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    expect(unchangedRound.status).toBe("PENDING");
  });
});

describe("setRoundRostersLogic", () => {
  async function makeRoundWithPairing() {
    const tournament = await makeTournament();
    const round = await prisma.round.create({
      data: { tournamentId: tournament.id, number: 1, name: "Round 1", playersStart: 8, playersAdvance: 4 },
    });
    const teamA = await prisma.team.create({ data: { roundId: round.id, name: "Team A", order: 0 } });
    const teamB = await prisma.team.create({ data: { roundId: round.id, name: "Team B", order: 1 } });
    const [p1, p2, p3, p4] = await Promise.all([
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Roster 1", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Roster 2", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Roster 3", tier: 1 } }),
      prisma.player.create({ data: { tournamentId: tournament.id, name: "Roster 4", tier: 1 } }),
    ]);
    await prisma.teamMembership.createMany({
      data: [
        { teamId: teamA.id, playerId: p1.id },
        { teamId: teamA.id, playerId: p2.id },
        { teamId: teamB.id, playerId: p3.id },
        { teamId: teamB.id, playerId: p4.id },
      ],
    });
    // p1 & p2 locked into a Team A pairing — the thing a same-side toggle
    // shouldn't touch, but a side-switch for either of them should strand.
    const pairing = await prisma.pairing.create({
      data: { roundId: round.id, teamId: teamA.id, player1Id: p1.id, player2Id: p2.id, order: 1, locked: true },
    });
    return { round, teamA, teamB, p1, p2, p3, p4, pairing };
  }

  it("moves a player to the other team and cleans up their now-stale, uncommitted pairing", async () => {
    const { round, teamA, teamB, p1, p2, p3, p4, pairing } = await makeRoundWithPairing();

    // p2 switches from Team A to Team B; everyone else stays put.
    const result = await setRoundRostersLogic({
      roundId: round.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAPlayerIds: [p1.id],
      teamBPlayerIds: [p3.id, p4.id, p2.id],
    });
    expect(result).toEqual({ success: true });

    const p2Membership = await prisma.teamMembership.findFirst({ where: { playerId: p2.id } });
    expect(p2Membership?.teamId).toBe(teamB.id);

    const staleParing = await prisma.pairing.findUnique({ where: { id: pairing.id } });
    expect(staleParing).toBeNull();
  });

  it("blocks moving a player whose pairing is already committed to a match", async () => {
    const { round, teamA, teamB, p1, p2, p3, p4, pairing } = await makeRoundWithPairing();
    const otherPairing = await prisma.pairing.create({
      data: { roundId: round.id, teamId: teamB.id, player1Id: p3.id, player2Id: p4.id, order: 1, locked: true },
    });
    await prisma.match.create({
      data: { roundId: round.id, matchNumber: 1, teamAId: teamA.id, teamBId: teamB.id, pairingAId: pairing.id, pairingBId: otherPairing.id },
    });

    const result = await setRoundRostersLogic({
      roundId: round.id,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAPlayerIds: [p1.id],
      teamBPlayerIds: [p3.id, p4.id, p2.id],
    });
    expect(result.error).toBeTruthy();

    const p2Membership = await prisma.teamMembership.findFirst({ where: { playerId: p2.id } });
    expect(p2Membership?.teamId).toBe(teamA.id);

    const unchangedPairing = await prisma.pairing.findUnique({ where: { id: pairing.id } });
    expect(unchangedPairing).not.toBeNull();
  });
});
