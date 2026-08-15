// Development seed data. Run with `npm run db:seed` (or automatically via
// `npm run db:reset`). Produces a believable mid-Round-1 snapshot: a full
// 32-player field, a completed draft, locked pairings, and matches in a mix
// of states (complete / in progress / scheduled / mid course-selection) —
// including one pairing on each team that hasn't been matched up yet, to
// show the alternating matchmaking process still in flight, exactly like a
// real mid-tournament night would look.
import { PrismaClient, type Player, type Pairing } from "@prisma/client";

const prisma = new PrismaClient();

const TIER_BASE_HANDICAP: Record<number, number> = { 1: 3, 2: 9, 3: 15, 4: 21 };
const HOMETOWNS = [
  "Lakeside",
  "Millbrook",
  "Fairview",
  "Cedar Falls",
  "Ashworth",
  "Brookhaven",
  "Elmridge",
  "Harborview",
];

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(13, 30, 0, 0);
  return d;
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.courseSelection.deleteMany();
  await prisma.matchParticipant.deleteMany();
  await prisma.matchSegment.deleteMany();
  await prisma.match.deleteMany();
  await prisma.pairing.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.round.deleteMany();
  await prisma.course.deleteMany();
  await prisma.player.deleteMany();
  await prisma.tournament.deleteMany();

  console.log("Creating tournament...");
  const tournament = await prisma.tournament.create({
    data: {
      name: "Shark Tank Golf Invitational",
      subtitle: "32 Players. Four Tiers. Draft Your Team. Win Your Matches. Survive.",
      season: 2026,
      status: "ROUND_1_IN_PROGRESS",
      description:
        "A member-run, tiered match-play championship for the club. No handicap strokes — draft strategy and match play decide it.",
      prizePoolCents: 300_000,
      entryFeeCents: 10_000,
      paidPlayerCount: 30,
      championshipSplitSize: 4,
      startDate: daysFromNow(-10),
      isActive: true,
    },
  });

  console.log("Creating 32 players across 4 tiers...");
  const players: Player[] = [];
  let n = 1;
  for (let tier = 1; tier <= 4; tier++) {
    for (let i = 0; i < 8; i++) {
      const label = String(n).padStart(2, "0");
      const player = await prisma.player.create({
        data: {
          tournamentId: tournament.id,
          name: `Player ${label}`,
          tier,
          handicapIndex: Math.round((TIER_BASE_HANDICAP[tier]! + (i % 4) * 1.3) * 10) / 10,
          hometown: HOMETOWNS[(n - 1) % HOMETOWNS.length],
          status: "ACTIVE",
        },
      });
      players.push(player);
      n++;
    }
  }
  const byTier: Record<number, Player[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const p of players) byTier[p.tier]!.push(p);

  console.log("Creating approved courses...");
  const courseDefs = [
    {
      name: "Fairway Pines Golf Club",
      city: "Brookhaven",
      state: "OH",
      website: "https://example.com/fairway-pines",
      priceRange: "$45-60",
      notes: "Classic parkland layout. Greens run fast in late summer.",
      approved: true,
      active: true,
    },
    {
      name: "Blackthorn National",
      city: "Millbrook",
      state: "OH",
      website: "https://example.com/blackthorn",
      priceRange: "$70-90",
      notes: "The toughest track on the list — bring a couple extra balls off the tee.",
      approved: true,
      active: true,
    },
    {
      name: "Red Hawk Ridge",
      city: "Cedar Falls",
      state: "OH",
      website: "https://example.com/red-hawk-ridge",
      priceRange: "$35-50",
      notes: "Walkable, quick rounds. Good weekday tee time availability.",
      approved: true,
      active: true,
    },
    {
      name: "Lakeside Municipal",
      city: "Lakeside",
      state: "OH",
      website: "https://example.com/lakeside-muni",
      priceRange: "$25-35",
      notes: "Budget-friendly with generous fairways — a good back-nine shamble course.",
      approved: true,
      active: true,
    },
    {
      name: "The Quarry at Stonecrest",
      city: "Ashworth",
      state: "OH",
      website: "https://example.com/stonecrest",
      priceRange: "$60-80",
      notes: "Signature par-3 plays over the old quarry pit. Book 2 weeks out.",
      approved: true,
      active: true,
    },
    {
      name: "Windemere Golf & Country Club",
      city: "Harborview",
      state: "OH",
      website: "https://example.com/windemere",
      priceRange: "$55-70",
      notes: "Private-feel public course. Deactivated this season — call ahead only.",
      approved: true,
      active: false,
    },
  ];
  const courses = [];
  for (const c of courseDefs) {
    courses.push(await prisma.course.create({ data: { tournamentId: tournament.id, ...c } }));
  }
  const [pines, blackthorn, redHawk, lakeside, quarry] = courses;

  // ------------------------------------------------------------------
  // Round 1 — 32 to 16
  // ------------------------------------------------------------------
  console.log("Building Round 1 draft...");
  const round1 = await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      number: 1,
      name: "Round 1",
      status: "ACTIVE",
      playersStart: 32,
      playersAdvance: 16,
      deadline: daysFromNow(21),
    },
  });

  // Split each tier 4/4 so both teams get 4 players from every tier.
  const teamAPlayers: Player[] = [];
  const teamBPlayers: Player[] = [];
  for (let tier = 1; tier <= 4; tier++) {
    const group = byTier[tier]!;
    teamAPlayers.push(...group.slice(0, 4));
    teamBPlayers.push(...group.slice(4, 8));
  }

  const teamA = await prisma.team.create({ data: { roundId: round1.id, name: "Team A" } });
  const teamB = await prisma.team.create({ data: { roundId: round1.id, name: "Team B" } });

  await prisma.teamMembership.createMany({
    data: [
      ...teamAPlayers.map((p) => ({ teamId: teamA.id, playerId: p.id })),
      ...teamBPlayers.map((p) => ({ teamId: teamB.id, playerId: p.id })),
    ],
  });

  const captainA = teamAPlayers.find((p) => p.tier === 1)!;
  const captainB = teamBPlayers.find((p) => p.tier === 1)!;
  await prisma.team.update({ where: { id: teamA.id }, data: { captainId: captainA.id } });
  await prisma.team.update({ where: { id: teamB.id }, data: { captainId: captainB.id } });

  // Pair tier 1 with tier 4, and tier 2 with tier 3 — a simple balanced
  // pairing heuristic each team applies during the private pairing phase.
  function buildPairs(teamPlayers: Player[]): [Player, Player][] {
    const t1 = teamPlayers.filter((p) => p.tier === 1);
    const t2 = teamPlayers.filter((p) => p.tier === 2);
    const t3 = teamPlayers.filter((p) => p.tier === 3);
    const t4 = teamPlayers.filter((p) => p.tier === 4);
    const pairs: [Player, Player][] = [];
    for (let i = 0; i < 4; i++) pairs.push([t1[i]!, t4[i]!]);
    for (let i = 0; i < 4; i++) pairs.push([t2[i]!, t3[i]!]);
    return pairs;
  }

  async function createPairings(teamId: string, pairs: [Player, Player][]): Promise<Pairing[]> {
    const created: Pairing[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const [p1, p2] = pairs[i]!;
      created.push(
        await prisma.pairing.create({
          data: {
            roundId: round1.id,
            teamId,
            player1Id: p1.id,
            player2Id: p2.id,
            order: i + 1,
            locked: true,
          },
        }),
      );
    }
    return created;
  }

  const pairingsA = await createPairings(teamA.id, buildPairs(teamAPlayers));
  const pairingsB = await createPairings(teamB.id, buildPairs(teamBPlayers));

  console.log("Scheduling Round 1 matches...");

  interface SegmentDef {
    name: string;
    format: string;
    holes: string;
    order: number;
    pointsAvailable: number;
    winner: string | null;
    teamAScore?: number;
    teamBScore?: number;
    status: string;
  }

  async function createMatch(opts: {
    matchNumber: number;
    pairingA: Pairing;
    pairingB: Pairing;
    status: string;
    courseId?: string;
    scheduledDate?: Date;
    gameBookEventUrl?: string;
    gameBookLeaderboardUrl?: string;
    segments: SegmentDef[];
  }) {
    const match = await prisma.match.create({
      data: {
        roundId: round1.id,
        matchNumber: opts.matchNumber,
        teamAId: teamA.id,
        teamBId: teamB.id,
        pairingAId: opts.pairingA.id,
        pairingBId: opts.pairingB.id,
        courseId: opts.courseId,
        scheduledDate: opts.scheduledDate,
        status: opts.status,
        gameBookEventUrl: opts.gameBookEventUrl,
        gameBookLeaderboardUrl: opts.gameBookLeaderboardUrl,
      },
    });

    await prisma.matchParticipant.createMany({
      data: [
        { matchId: match.id, playerId: opts.pairingA.player1Id, side: "A" },
        { matchId: match.id, playerId: opts.pairingA.player2Id, side: "A" },
        { matchId: match.id, playerId: opts.pairingB.player1Id, side: "B" },
        { matchId: match.id, playerId: opts.pairingB.player2Id, side: "B" },
      ],
    });

    for (const seg of opts.segments) {
      await prisma.matchSegment.create({ data: { matchId: match.id, ...seg } });
    }

    return match;
  }

  const front9 = (winner: string | null, a?: number, b?: number, status = "COMPLETE"): SegmentDef => ({
    name: "Front 9",
    format: "SCRAMBLE",
    holes: "1-9",
    order: 1,
    pointsAvailable: 1,
    winner,
    teamAScore: a,
    teamBScore: b,
    status,
  });
  const back9 = (winner: string | null, a?: number, b?: number, status = "COMPLETE"): SegmentDef => ({
    name: "Back 9",
    format: "SHAMBLE",
    holes: "10-18",
    order: 2,
    pointsAvailable: 1,
    winner,
    teamAScore: a,
    teamBScore: b,
    status,
  });
  const overall = (winner: string | null, a?: number, b?: number, status = "COMPLETE"): SegmentDef => ({
    name: "Overall 18",
    format: "OVERALL",
    holes: "1-18",
    order: 3,
    pointsAvailable: 1,
    winner,
    teamAScore: a,
    teamBScore: b,
    status,
  });

  // Match 1 — complete, matches the worked example from the rules (A 2 - B 1)
  await createMatch({
    matchNumber: 1,
    pairingA: pairingsA[0]!,
    pairingB: pairingsB[0]!,
    status: "COMPLETE",
    courseId: pines!.id,
    scheduledDate: daysFromNow(-6),
    gameBookLeaderboardUrl: "https://example.com/gamebook/leaderboard/round1-match1",
    segments: [front9("A", 32, 35), back9("B", 37, 33), overall("A", 69, 70)],
  });

  // Match 2 — complete, a clean sweep for Team B
  await createMatch({
    matchNumber: 2,
    pairingA: pairingsA[1]!,
    pairingB: pairingsB[1]!,
    status: "COMPLETE",
    courseId: redHawk!.id,
    scheduledDate: daysFromNow(-6),
    segments: [front9("B", 36, 33), back9("B", 38, 34), overall("B", 74, 67)],
  });

  // Match 3 — complete, and tied overall (demonstrates half-point ties)
  await createMatch({
    matchNumber: 3,
    pairingA: pairingsA[2]!,
    pairingB: pairingsB[2]!,
    status: "COMPLETE",
    courseId: pines!.id,
    scheduledDate: daysFromNow(-4),
    segments: [front9("TIE", 34, 34), back9("A", 35, 38), overall("B", 71, 70)],
  });

  // Match 4 — in progress: front 9 decided, back 9 and overall still to play
  await createMatch({
    matchNumber: 4,
    pairingA: pairingsA[3]!,
    pairingB: pairingsB[3]!,
    status: "IN_PROGRESS",
    courseId: blackthorn!.id,
    scheduledDate: daysFromNow(-1),
    gameBookEventUrl: "https://example.com/gamebook/round1-match4",
    segments: [
      front9("A", 33, 36),
      back9(null, undefined, undefined, "PENDING"),
      overall(null, undefined, undefined, "PENDING"),
    ],
  });

  // Match 5 — scheduled, course booked, nothing played yet
  await createMatch({
    matchNumber: 5,
    pairingA: pairingsA[4]!,
    pairingB: pairingsB[4]!,
    status: "SCHEDULED",
    courseId: lakeside!.id,
    scheduledDate: daysFromNow(4),
    segments: [
      front9(null, undefined, undefined, "PENDING"),
      back9(null, undefined, undefined, "PENDING"),
      overall(null, undefined, undefined, "PENDING"),
    ],
  });

  // Match 6 — mid course-selection: 3 of 4 players have submitted a pick,
  // nobody has hit "Randomize" yet. Great live example for /courses.
  const match6 = await createMatch({
    matchNumber: 6,
    pairingA: pairingsA[5]!,
    pairingB: pairingsB[5]!,
    status: "COURSE_SELECTION",
    segments: [
      front9(null, undefined, undefined, "PENDING"),
      back9(null, undefined, undefined, "PENDING"),
      overall(null, undefined, undefined, "PENDING"),
    ],
  });
  await prisma.courseSelection.createMany({
    data: [
      { matchId: match6.id, playerId: pairingsA[5]!.player1Id, courseId: quarry!.id },
      { matchId: match6.id, playerId: pairingsA[5]!.player2Id, courseId: quarry!.id },
      { matchId: match6.id, playerId: pairingsB[5]!.player1Id, courseId: redHawk!.id },
      // pairingsB[5]'s second player hasn't submitted a pick yet
    ],
  });

  // Match 7 — scheduled, with a live GameBook link to demo "Follow Live"
  await createMatch({
    matchNumber: 7,
    pairingA: pairingsA[6]!,
    pairingB: pairingsB[6]!,
    status: "SCHEDULED",
    courseId: blackthorn!.id,
    scheduledDate: daysFromNow(6),
    gameBookEventUrl: "https://example.com/gamebook/round1-match7",
    segments: [
      front9(null, undefined, undefined, "PENDING"),
      back9(null, undefined, undefined, "PENDING"),
      overall(null, undefined, undefined, "PENDING"),
    ],
  });

  // pairingsA[7] and pairingsB[7] are intentionally left unmatched — each
  // team still has one locked pair waiting for the alternating matchmaking
  // process to assign it an opponent (Match 8 hasn't been made yet).

  console.log("Creating Round 2 and Championship placeholders...");
  await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      number: 2,
      name: "Round 2",
      status: "PENDING",
      playersStart: 16,
      playersAdvance: 8,
    },
  });
  await prisma.round.create({
    data: {
      tournamentId: tournament.id,
      number: 3,
      name: "Championship",
      status: "PENDING",
      playersStart: 8,
      playersAdvance: 4,
    },
  });

  console.log("Seed complete:");
  console.log(`  Tournament: ${tournament.name} (${tournament.season})`);
  console.log(`  Players: ${players.length}`);
  console.log(`  Courses: ${courses.length}`);
  console.log(`  Round 1 matches: 7 scheduled, 1 pairing per team still unmatched`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
