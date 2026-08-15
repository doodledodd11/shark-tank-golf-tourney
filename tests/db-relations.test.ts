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
