// Integration tests for the live-scorecard I/O layer against the real
// Postgres database — same conventions as db-relations.test.ts /
// matchmaking.test.ts (TEST_SEASON marker, afterAll cleanup).
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { SEGMENT_TEMPLATES } from "@/lib/segment-templates";
import { ensureSideAccessTokensLogic, getScorecardEntryData, submitHoleScoresLogic } from "@/lib/scorecard";

const TEST_SEASON = 2096;
const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.tournament.deleteMany({ where: { season: TEST_SEASON } });
  await prisma.$disconnect();
});

async function makeMatch() {
  const tournament = await prisma.tournament.create({ data: { name: "Scorecard Test", season: TEST_SEASON } });
  const round = await prisma.round.create({
    data: { tournamentId: tournament.id, number: 1, name: "Round 1", playersStart: 4, playersAdvance: 2 },
  });
  const teamA = await prisma.team.create({ data: { roundId: round.id, name: "Team A", order: 0 } });
  const teamB = await prisma.team.create({ data: { roundId: round.id, name: "Team B", order: 1 } });
  const [p1, p2, p3, p4] = await Promise.all(
    ["Alice", "Bob", "Carl", "Dana"].map((name) => prisma.player.create({ data: { tournamentId: tournament.id, name, tier: 1 } })),
  );
  const match = await prisma.match.create({
    data: {
      roundId: round.id,
      matchNumber: 1,
      teamAId: teamA.id,
      teamBId: teamB.id,
      status: "SCHEDULED",
      participants: {
        create: [
          { playerId: p1!.id, side: "A" },
          { playerId: p2!.id, side: "A" },
          { playerId: p3!.id, side: "B" },
          { playerId: p4!.id, side: "B" },
        ],
      },
      segments: { create: SEGMENT_TEMPLATES.ROUND_1 },
    },
  });
  return { tournament, round, teamA, teamB, match };
}

const PAR = [4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 4, 4, 5, 4, 3, 4]; // 70 total

describe("ensureSideAccessTokensLogic", () => {
  it("issues both side tokens and doesn't rotate an existing one", async () => {
    const { match } = await makeMatch();
    const first = await ensureSideAccessTokensLogic(match.id);
    expect(first.success).toBe(true);

    const afterFirst = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(afterFirst.teamASideAccessToken).toBeTruthy();
    expect(afterFirst.teamBSideAccessToken).toBeTruthy();

    await ensureSideAccessTokensLogic(match.id);
    const afterSecond = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(afterSecond.teamASideAccessToken).toBe(afterFirst.teamASideAccessToken);
    expect(afterSecond.teamBSideAccessToken).toBe(afterFirst.teamBSideAccessToken);
  });
});

describe("getScorecardEntryData", () => {
  it("resolves the right side from its token and returns null for a bad one", async () => {
    const { match } = await makeMatch();
    await ensureSideAccessTokensLogic(match.id);
    const { teamASideAccessToken, teamBSideAccessToken } = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    const dataA = await getScorecardEntryData(match.id, teamASideAccessToken!);
    expect(dataA!.side).toBe("A");
    expect(dataA!.myNames).toBe("Alice + Bob");
    expect(dataA!.opponentNames).toBe("Carl + Dana");

    const dataB = await getScorecardEntryData(match.id, teamBSideAccessToken!);
    expect(dataB!.side).toBe("B");

    expect(await getScorecardEntryData(match.id, "not-a-real-token")).toBeNull();
  });
});

describe("submitHoleScoresLogic", () => {
  it("saves a side's holes and updates that side's segment scores, leaving the other side's untouched", async () => {
    const { match } = await makeMatch();
    await ensureSideAccessTokensLogic(match.id);
    const { teamASideAccessToken } = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    const result = await submitHoleScoresLogic({ matchId: match.id, token: teamASideAccessToken!, holes: PAR });
    expect(result.success).toBe(true);

    const segments = await prisma.matchSegment.findMany({ where: { matchId: match.id } });
    const front9 = segments.find((s) => s.name === "Front 9")!;
    const back9 = segments.find((s) => s.name === "Back 9")!;
    const overall = segments.find((s) => s.name === "Overall 18")!;

    expect(front9.teamAScore).toBe(35);
    expect(front9.teamBScore).toBeNull();
    expect(front9.status).toBe("IN_PROGRESS"); // A done, B hasn't started
    expect(overall.status).toBe("IN_PROGRESS");

    const refreshedMatch = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(refreshedMatch.status).toBe("IN_PROGRESS");
    expect(refreshedMatch.teamAHoleScores).toEqual(PAR);
    expect(back9.teamAScore).toBe(35);
  });

  it("completes the match once both sides finish, and picks a winner", async () => {
    const { match } = await makeMatch();
    await ensureSideAccessTokensLogic(match.id);
    const { teamASideAccessToken, teamBSideAccessToken } = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    const worse = PAR.map((h) => h + 1); // one over par every hole
    await submitHoleScoresLogic({ matchId: match.id, token: teamASideAccessToken!, holes: PAR });
    await submitHoleScoresLogic({ matchId: match.id, token: teamBSideAccessToken!, holes: worse });

    const refreshedMatch = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(refreshedMatch.status).toBe("COMPLETE");

    const overall = await prisma.matchSegment.findFirstOrThrow({ where: { matchId: match.id, name: "Overall 18" } });
    expect(overall.teamAScore).toBe(70);
    expect(overall.teamBScore).toBe(88);
    expect(overall.winner).toBe("A");
    expect(overall.status).toBe("COMPLETE");
  });

  it("refuses a bad token, wrong-length arrays, and out-of-range scores", async () => {
    const { match } = await makeMatch();
    await ensureSideAccessTokensLogic(match.id);
    const { teamASideAccessToken } = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    const badToken = await submitHoleScoresLogic({ matchId: match.id, token: "nope", holes: PAR });
    expect(badToken.error).toBeTruthy();

    const wrongLength = await submitHoleScoresLogic({ matchId: match.id, token: teamASideAccessToken!, holes: PAR.slice(0, 17) });
    expect(wrongLength.error).toBeTruthy();

    const outOfRange = await submitHoleScoresLogic({
      matchId: match.id,
      token: teamASideAccessToken!,
      holes: [99, ...PAR.slice(1)],
    });
    expect(outOfRange.error).toBeTruthy();
  });

  it("lets a side revise their holes after the fact, recomputing cleanly", async () => {
    const { match } = await makeMatch();
    await ensureSideAccessTokensLogic(match.id);
    const { teamASideAccessToken } = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    await submitHoleScoresLogic({ matchId: match.id, token: teamASideAccessToken!, holes: PAR });
    const revised = PAR.map((h) => h - 1); // shoot a lot better on the redo
    await submitHoleScoresLogic({ matchId: match.id, token: teamASideAccessToken!, holes: revised });

    const front9 = await prisma.matchSegment.findFirstOrThrow({ where: { matchId: match.id, name: "Front 9" } });
    expect(front9.teamAScore).toBe(26); // 35 - 9 holes * 1 stroke each
  });
});
