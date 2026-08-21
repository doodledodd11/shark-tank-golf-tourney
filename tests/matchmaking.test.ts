// Integration tests for the twosome-lock / live-matchmaking I/O layer
// against the real Postgres database — same conventions as
// db-relations.test.ts (TEST_SEASON marker, afterAll cleanup).
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  ensureCaptainAccessTokensLogic,
  setFirstAnnouncerLogic,
  getTwosomeLockBoardData,
  lockTwosomeLogic,
  deleteTwosomeLogic,
  getMatchmakingBoardData,
  announcePairingLogic,
  respondToPairingLogic,
  cancelMatchmakingLogic,
  randomizeChampionshipTeamMatchupsLogic,
  pairSinglesBySeedLogic,
  cancelSinglesMatchmakingLogic,
} from "@/lib/matchmaking";

const TEST_SEASON = 2098; // distinct from db-relations.test.ts's 2099, same cleanup idea
const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.tournament.deleteMany({ where: { season: TEST_SEASON } });
  await prisma.$disconnect();
});

/** A rostered round with two teams already set up — `playersPerTeam`
 * players each, named so tests can address them directly. No pairings yet.
 * Defaults to a Round 1 shape; pass `roundNumber: 3` for championship
 * fixtures. */
async function makeRosteredRound(playersPerTeam: number, roundNumber = 1) {
  const tournament = await prisma.tournament.create({ data: { name: "Matchmaking Test", season: TEST_SEASON } });
  const round = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      number: roundNumber,
      name: roundNumber === 3 ? "Championship" : `Round ${roundNumber}`,
      playersStart: playersPerTeam * 4,
      playersAdvance: playersPerTeam * 2,
    },
  });
  const teamA = await prisma.team.create({ data: { roundId: round.id, name: "Team A", order: 0 } });
  const teamB = await prisma.team.create({ data: { roundId: round.id, name: "Team B", order: 1 } });

  async function roster(team: typeof teamA, prefix: string) {
    const players = [];
    for (let i = 0; i < playersPerTeam; i++) {
      const p = await prisma.player.create({ data: { tournamentId: tournament.id, name: `${prefix}${i + 1}`, tier: 1 } });
      await prisma.teamMembership.create({ data: { teamId: team.id, playerId: p.id } });
      players.push(p);
    }
    return players;
  }

  const teamAPlayers = await roster(teamA, "A");
  const teamBPlayers = await roster(teamB, "B");
  return { tournament, round, teamA, teamB, teamAPlayers, teamBPlayers };
}

describe("ensureCaptainAccessTokensLogic", () => {
  it("issues a token for each team that doesn't already have one", async () => {
    const { round } = await makeRosteredRound(2);
    const result = await ensureCaptainAccessTokensLogic(round.id);
    expect(result.success).toBe(true);

    const teams = await prisma.team.findMany({ where: { roundId: round.id } });
    expect(teams.every((t) => Boolean(t.captainAccessToken))).toBe(true);
  });

  it("leaves an existing token untouched", async () => {
    const { round, teamA } = await makeRosteredRound(2);
    await prisma.team.update({ where: { id: teamA.id }, data: { captainAccessToken: "existing-token" } });

    await ensureCaptainAccessTokensLogic(round.id);

    const refreshed = await prisma.team.findUniqueOrThrow({ where: { id: teamA.id } });
    expect(refreshed.captainAccessToken).toBe("existing-token");
  });
});

describe("twosome locking", () => {
  it("scopes the board to the requesting captain's own team, and only counts the other team's progress", async () => {
    // 6 players (3 required pairings) so locking just one leaves 4 players
    // unpaired, not the 2 that would trigger this team's own auto-lock —
    // this test wants a genuine "1 of 3 locked" partial state to check.
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(6);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    expect(tA!.id).toBe(teamA.id);

    // Team B locks one pairing — Team A's board should see only a count, not who's in it.
    await lockTwosomeLogic({
      roundId: round.id,
      captainToken: tB!.captainAccessToken!,
      player1Id: (await prisma.teamMembership.findMany({ where: { teamId: teamB.id } }))[0]!.playerId,
      player2Id: (await prisma.teamMembership.findMany({ where: { teamId: teamB.id } }))[1]!.playerId,
    });

    const board = await getTwosomeLockBoardData(round.id, tA!.captainAccessToken!);
    expect(board!.myTeamId).toBe(teamA.id);
    expect(board!.roster.map((p) => p.id).sort()).toEqual(teamAPlayers.map((p) => p.id).sort());
    expect(board!.pairings).toEqual([]); // Team A hasn't locked anything yet
    expect(board!.requiredPairings).toBe(3); // 6 players / 2
    expect(board!.otherTeamLockedCount).toBe(1); // Team B's progress is visible as a count...
    expect(board!.otherTeamRequired).toBe(3);
    // ...but nothing about WHO is in Team B's pairing is exposed anywhere on this board.
    expect(JSON.stringify(board)).not.toContain(teamBPlayers[0]!.name);
  });

  it("locks a twosome, then rejects reusing either of those players", async () => {
    const { round, teamA, teamAPlayers } = await makeRosteredRound(4);
    await ensureCaptainAccessTokensLogic(round.id);
    const token = (await prisma.team.findUniqueOrThrow({ where: { id: teamA.id } })).captainAccessToken!;

    const ok = await lockTwosomeLogic({
      roundId: round.id,
      captainToken: token,
      player1Id: teamAPlayers[0]!.id,
      player2Id: teamAPlayers[1]!.id,
    });
    expect(ok.success).toBe(true);

    const reuse = await lockTwosomeLogic({
      roundId: round.id,
      captainToken: token,
      player1Id: teamAPlayers[1]!.id,
      player2Id: teamAPlayers[2]!.id,
    });
    expect(reuse.error).toBeTruthy();
  });

  it("refuses a twosome from someone else's roster", async () => {
    const { round, teamA, teamBPlayers } = await makeRosteredRound(4);
    await ensureCaptainAccessTokensLogic(round.id);
    const token = (await prisma.team.findUniqueOrThrow({ where: { id: teamA.id } })).captainAccessToken!;

    const result = await lockTwosomeLogic({
      roundId: round.id,
      captainToken: token,
      player1Id: teamBPlayers[0]!.id,
      player2Id: teamBPlayers[1]!.id,
    });
    expect(result.error).toBeTruthy();
  });

  it("refuses to lock more than the required number of twosomes", async () => {
    const { round, teamA, teamAPlayers } = await makeRosteredRound(2); // 1 required pairing
    await ensureCaptainAccessTokensLogic(round.id);
    const token = (await prisma.team.findUniqueOrThrow({ where: { id: teamA.id } })).captainAccessToken!;

    await lockTwosomeLogic({ roundId: round.id, captainToken: token, player1Id: teamAPlayers[0]!.id, player2Id: teamAPlayers[1]!.id });
    // No players left, but even a same-player call should be refused for being over quota, not just "same player".
    const over = await lockTwosomeLogic({ roundId: round.id, captainToken: token, player1Id: teamAPlayers[0]!.id, player2Id: teamAPlayers[1]!.id });
    expect(over.error).toBeTruthy();
  });

  it("auto-locks the final twosome once only two players are left unpaired", async () => {
    const { round, teamA, teamAPlayers } = await makeRosteredRound(4); // 2 required pairings
    await ensureCaptainAccessTokensLogic(round.id);
    const token = (await prisma.team.findUniqueOrThrow({ where: { id: teamA.id } })).captainAccessToken!;

    const result = await lockTwosomeLogic({
      roundId: round.id,
      captainToken: token,
      player1Id: teamAPlayers[0]!.id,
      player2Id: teamAPlayers[1]!.id,
    });
    expect(result.success).toBe(true);

    // The other two players on the roster can only go together — no
    // second manual lock call needed.
    const pairings = await prisma.pairing.findMany({ where: { teamId: teamA.id }, orderBy: { order: "asc" } });
    expect(pairings).toHaveLength(2);
    const secondPairing = pairings[1]!;
    expect([secondPairing.player1Id, secondPairing.player2Id].sort()).toEqual(
      [teamAPlayers[2]!.id, teamAPlayers[3]!.id].sort(),
    );

    const board = await getTwosomeLockBoardData(round.id, token);
    expect(board!.isComplete).toBe(true);
  });

  it("lets a captain delete an unmatched twosome to redo it", async () => {
    const { round, teamA, teamAPlayers } = await makeRosteredRound(4);
    await ensureCaptainAccessTokensLogic(round.id);
    const token = (await prisma.team.findUniqueOrThrow({ where: { id: teamA.id } })).captainAccessToken!;

    await lockTwosomeLogic({ roundId: round.id, captainToken: token, player1Id: teamAPlayers[0]!.id, player2Id: teamAPlayers[1]!.id });
    const pairing = await prisma.pairing.findFirstOrThrow({ where: { teamId: teamA.id } });

    const result = await deleteTwosomeLogic({ roundId: round.id, captainToken: token, pairingId: pairing.id });
    expect(result.success).toBe(true);
    expect(await prisma.pairing.findUnique({ where: { id: pairing.id } })).toBeNull();
  });
});

describe("live matchmaking", () => {
  async function lockAllTwosomes(roundId: string, teamId: string, token: string, players: { id: string }[]) {
    for (let i = 0; i < players.length; i += 2) {
      await lockTwosomeLogic({ roundId, captainToken: token, player1Id: players[i]!.id, player2Id: players[i + 1]!.id });
    }
  }

  it("opens with Team A announcing, alternates through two manual cycles, then auto-builds the final match", async () => {
    // 3 pairings per team: two real announce/respond cycles, then the
    // third and last pairing on each side can only play each other, so
    // that match should be built automatically inside the 2nd respond.
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(6);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const board1 = await getMatchmakingBoardData(round.id);
    expect(board1!.phase).toBe("ANNOUNCE");
    expect(board1!.onTheClockTeamId).toBe(teamA.id);
    expect(board1!.isComplete).toBe(false);

    const [pairingA1, pairingA2, pairingA3] = await prisma.pairing.findMany({ where: { teamId: teamA.id }, orderBy: { order: "asc" } });
    const [pairingB1, pairingB2, pairingB3] = await prisma.pairing.findMany({ where: { teamId: teamB.id }, orderBy: { order: "asc" } });

    // Cycle 1: A announces, B responds.
    const announce1 = await announcePairingLogic({ roundId: round.id, captainToken: tA!.captainAccessToken!, pairingId: pairingA1!.id });
    expect(announce1.success).toBe(true);

    const board2 = await getMatchmakingBoardData(round.id);
    expect(board2!.phase).toBe("RESPOND");
    expect(board2!.onTheClockTeamId).toBe(teamB.id);
    expect(board2!.announcedPairingId).toBe(pairingA1!.id);

    const respond1 = await respondToPairingLogic({ roundId: round.id, captainToken: tB!.captainAccessToken!, pairingId: pairingB1!.id });
    expect(respond1.success).toBe(true);

    const match1 = await prisma.match.findFirstOrThrow({ where: { roundId: round.id, matchNumber: 1 } });
    expect([match1.pairingAId, match1.pairingBId].sort()).toEqual([pairingA1!.id, pairingB1!.id].sort());
    expect(match1.status).toBe("COURSE_SELECTION");
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(1); // 4 pairings still unmatched, no auto-complete yet

    // Cycle 2: now Team B announces (alternation), Team A responds. That
    // leaves exactly one pairing per team (pairingA3/pairingB3), so the
    // final match should get built automatically right here too.
    const board3 = await getMatchmakingBoardData(round.id);
    expect(board3!.phase).toBe("ANNOUNCE");
    expect(board3!.onTheClockTeamId).toBe(teamB.id);

    await announcePairingLogic({ roundId: round.id, captainToken: tB!.captainAccessToken!, pairingId: pairingB2!.id });
    const respond2 = await respondToPairingLogic({ roundId: round.id, captainToken: tA!.captainAccessToken!, pairingId: pairingA2!.id });
    expect(respond2.success).toBe(true);

    const finalBoard = await getMatchmakingBoardData(round.id);
    expect(finalBoard!.isComplete).toBe(true);
    expect(finalBoard!.phase).toBeNull();
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(3); // 2 manual + 1 auto-built

    const match3 = await prisma.match.findFirstOrThrow({ where: { roundId: round.id, matchNumber: 3 } });
    expect([match3.pairingAId, match3.pairingBId].sort()).toEqual([pairingA3!.id, pairingB3!.id].sort());
    expect(match3.status).toBe("COURSE_SELECTION");
  }, 60_000);

  it("auto-builds the final match without an announce/respond cycle when it's a 1v1 forced pairing", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(2); // 1 pairing per team
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const [pairingA1] = await prisma.pairing.findMany({ where: { teamId: teamA.id } });
    const [pairingB1] = await prisma.pairing.findMany({ where: { teamId: teamB.id } });
    await announcePairingLogic({ roundId: round.id, captainToken: tA!.captainAccessToken!, pairingId: pairingA1!.id });
    const respond = await respondToPairingLogic({ roundId: round.id, captainToken: tB!.captainAccessToken!, pairingId: pairingB1!.id });
    expect(respond.success).toBe(true);

    // This IS the last possible match already (1 pairing per team), so
    // there's nothing left for the auto-complete to build — just confirms
    // it doesn't try to conjure up an extra match from nothing.
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(1);
    const board = await getMatchmakingBoardData(round.id);
    expect(board!.isComplete).toBe(true);
  });

  it("lets an admin override who announces first", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const before = await getMatchmakingBoardData(round.id);
    expect(before!.onTheClockTeamId).toBe(teamA.id); // default: team order 0 announces first

    const setResult = await setFirstAnnouncerLogic(round.id, teamB.id);
    expect(setResult.success).toBe(true);

    const after = await getMatchmakingBoardData(round.id);
    expect(after!.onTheClockTeamId).toBe(teamB.id);
  });

  it("refuses an announcement out of turn, and a response before anything's announced", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const [pairingB1] = await prisma.pairing.findMany({ where: { teamId: teamB.id } });

    // Team B tries to announce first, but it's Team A's turn.
    const wrongTurn = await announcePairingLogic({ roundId: round.id, captainToken: tB!.captainAccessToken!, pairingId: pairingB1!.id });
    expect(wrongTurn.error).toBeTruthy();

    // Nobody's announced yet, so a response should be refused too.
    const tooEarly = await respondToPairingLogic({ roundId: round.id, captainToken: tB!.captainAccessToken!, pairingId: pairingB1!.id });
    expect(tooEarly.error).toBeTruthy();
  });

  it("cancelMatchmakingLogic deletes matches but leaves locked twosomes intact", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(2); // 1 pairing per team
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const [pairingA1] = await prisma.pairing.findMany({ where: { teamId: teamA.id } });
    const [pairingB1] = await prisma.pairing.findMany({ where: { teamId: teamB.id } });
    await announcePairingLogic({ roundId: round.id, captainToken: tA!.captainAccessToken!, pairingId: pairingA1!.id });
    await respondToPairingLogic({ roundId: round.id, captainToken: tB!.captainAccessToken!, pairingId: pairingB1!.id });
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(1);

    const result = await cancelMatchmakingLogic(round.id);
    expect(result.success).toBe(true);
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(0);

    const pairings = await prisma.pairing.findMany({ where: { roundId: round.id } });
    expect(pairings).toHaveLength(2); // still there, still locked
    expect(pairings.every((p) => p.locked && !p.announced)).toBe(true);

    // Matchmaking can restart cleanly from the top.
    const board = await getMatchmakingBoardData(round.id);
    expect(board!.phase).toBe("ANNOUNCE");
    expect(board!.onTheClockTeamId).toBe(teamA.id);
  });
});

describe("championship: random team matchups + singles matchmaking", () => {
  async function lockAllTwosomes(roundId: string, teamId: string, token: string, players: { id: string }[]) {
    for (let i = 0; i < players.length; i += 2) {
      await lockTwosomeLogic({ roundId, captainToken: token, player1Id: players[i]!.id, player2Id: players[i + 1]!.id });
    }
  }

  it("randomizes the two 2v2 matchups from locked twosomes, using the championship segment template", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4, 3); // 2 pairings/team
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const result = await randomizeChampionshipTeamMatchupsLogic(round.id);
    expect(result.success).toBe(true);

    const matches = await prisma.match.findMany({ where: { roundId: round.id }, include: { segments: true } });
    expect(matches).toHaveLength(2);
    for (const m of matches) {
      expect(m.pairingAId).not.toBeNull();
      expect(m.pairingBId).not.toBeNull();
      expect(m.segments.map((s) => s.name)).toEqual(["Team Match"]); // CHAMPIONSHIP_TEAM template
    }
    // Every locked twosome ends up used exactly once.
    const usedPairingIds = matches.flatMap((m) => [m.pairingAId, m.pairingBId]);
    expect(new Set(usedPairingIds).size).toBe(4);
  });

  it("refuses to randomize for a non-championship round", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4, 1);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);

    const result = await randomizeChampionshipTeamMatchupsLogic(round.id);
    expect(result.error).toBeTruthy();
  });

  it("pairs singles by seed rank within each team's own roster", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4, 3);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);
    await randomizeChampionshipTeamMatchupsLogic(round.id); // 2 team matches now exist; shouldn't affect singles eligibility

    // Scramble each side's seed relative to roster/creation order, to prove
    // the pairing follows seed rank, not array position.
    await prisma.player.update({ where: { id: teamAPlayers[0]!.id }, data: { seed: 4 } });
    await prisma.player.update({ where: { id: teamAPlayers[1]!.id }, data: { seed: 1 } });
    await prisma.player.update({ where: { id: teamAPlayers[2]!.id }, data: { seed: 3 } });
    await prisma.player.update({ where: { id: teamAPlayers[3]!.id }, data: { seed: 2 } });
    await prisma.player.update({ where: { id: teamBPlayers[0]!.id }, data: { seed: 2 } });
    await prisma.player.update({ where: { id: teamBPlayers[1]!.id }, data: { seed: 4 } });
    await prisma.player.update({ where: { id: teamBPlayers[2]!.id }, data: { seed: 1 } });
    await prisma.player.update({ where: { id: teamBPlayers[3]!.id }, data: { seed: 3 } });

    const result = await pairSinglesBySeedLogic(round.id);
    expect(result.success).toBe(true);

    const singlesMatches = await prisma.match.findMany({
      where: { roundId: round.id, pairingAId: null, pairingBId: null, isPlayoff: false },
      include: { participants: true, segments: true },
    });
    expect(singlesMatches).toHaveLength(4);
    expect(singlesMatches[0]!.segments.map((s) => s.name)).toEqual(["Singles Match"]);

    // Best (seed 1) vs best: teamAPlayers[1] should face teamBPlayers[2].
    const bestVsBest = singlesMatches.find((m) => m.participants.some((p) => p.playerId === teamAPlayers[1]!.id))!;
    expect(bestVsBest.participants.map((p) => p.playerId).sort()).toEqual([teamAPlayers[1]!.id, teamBPlayers[2]!.id].sort());

    // Worst (seed 4) vs worst: teamAPlayers[0] should face teamBPlayers[1].
    const worstVsWorst = singlesMatches.find((m) => m.participants.some((p) => p.playerId === teamAPlayers[0]!.id))!;
    expect(worstVsWorst.participants.map((p) => p.playerId).sort()).toEqual([teamAPlayers[0]!.id, teamBPlayers[1]!.id].sort());

    // Every player is used exactly once.
    const usedPlayerIds = singlesMatches.flatMap((m) => m.participants.map((p) => p.playerId));
    expect(new Set(usedPlayerIds).size).toBe(8);
  }, 30_000);

  it("falls back to a deterministic pairing when seeds aren't set", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4, 3);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);
    await randomizeChampionshipTeamMatchupsLogic(round.id);

    const result = await pairSinglesBySeedLogic(round.id);
    expect(result.success).toBe(true);

    const singlesMatches = await prisma.match.findMany({
      where: { roundId: round.id, pairingAId: null, pairingBId: null, isPlayoff: false },
      include: { participants: true },
    });
    expect(singlesMatches).toHaveLength(4);
    const usedPlayerIds = singlesMatches.flatMap((m) => m.participants.map((p) => p.playerId));
    expect(new Set(usedPlayerIds).size).toBe(8);
  });

  it("cancelSinglesMatchmakingLogic removes only the singles matches, leaving the team matches alone", async () => {
    const { round, teamA, teamB, teamAPlayers, teamBPlayers } = await makeRosteredRound(4, 3);
    await ensureCaptainAccessTokensLogic(round.id);
    const [tA, tB] = await prisma.team.findMany({ where: { roundId: round.id }, orderBy: { order: "asc" } });
    await lockAllTwosomes(round.id, teamA.id, tA!.captainAccessToken!, teamAPlayers);
    await lockAllTwosomes(round.id, teamB.id, tB!.captainAccessToken!, teamBPlayers);
    await randomizeChampionshipTeamMatchupsLogic(round.id);

    await pairSinglesBySeedLogic(round.id);
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(6); // 2 team + 4 singles

    const result = await cancelSinglesMatchmakingLogic(round.id);
    expect(result.success).toBe(true);
    expect(await prisma.match.count({ where: { roundId: round.id } })).toBe(2); // team matches survive
  });
});
