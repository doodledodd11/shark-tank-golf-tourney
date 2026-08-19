import { describe, expect, it } from "vitest";
import {
  splitName,
  buildSquabbitPlayersCsv,
  parseSquabbitMatchCsv,
  computeMatchImport,
  type MatchImportParticipant,
} from "@/lib/squabbit";

describe("splitName", () => {
  it("splits a two-word name on the first space", () => {
    expect(splitName("Player 01")).toEqual({ first: "Player", last: "01" });
  });

  it("keeps everything after the first space as the last name", () => {
    expect(splitName("Jean Luc Picard")).toEqual({ first: "Jean", last: "Luc Picard" });
  });

  it("falls back to repeating a single-word name in both fields", () => {
    expect(splitName("Cher")).toEqual({ first: "Cher", last: "Cher" });
  });
});

describe("buildSquabbitPlayersCsv", () => {
  it("produces the exact header Squabbit's import expects", () => {
    const csv = buildSquabbitPlayersCsv([]);
    expect(csv.split("\n")[0]).toBe("First,Last,Email,Phone,Gender,WHS ID,Handicap,Team,Tee,Registered,Transport");
  });

  it("splits names, leaves Registered blank, and passes through everything else", () => {
    const csv = buildSquabbitPlayersCsv([
      {
        name: "Player 01",
        email: "p01@example.com",
        phone: "555-0100",
        gender: "Male",
        whsId: "1234567",
        handicapIndex: 3.2,
        teamName: "Team 1",
        preferredTee: "Black",
        transport: "Cart",
      },
    ]);
    const row = csv.split("\n")[1];
    expect(row).toBe("Player,01,p01@example.com,555-0100,Male,1234567,3.2,Team 1,Black,,Cart");
  });

  it("quotes a field containing a comma", () => {
    const csv = buildSquabbitPlayersCsv([
      {
        name: "Player 02",
        email: null,
        phone: null,
        gender: null,
        whsId: null,
        handicapIndex: null,
        teamName: null,
        preferredTee: null,
        transport: "Cart, shared",
      },
    ]);
    expect(csv.split("\n")[1]).toContain('"Cart, shared"');
  });
});

// A real export pulled from a Squabbit test round (see the research
// conversation) — a genuine 2v2 team match where both partners on a side
// share the same recorded score, exactly like a real Scramble result.
const REAL_COMPLETE_MATCH_CSV = `
Champions Golf Course,"Aug 19, 2026 9:00 AM"
,,Handicap,Hole 1,Hole 2,Hole 3,Hole 4,Hole 5,Hole 6,Hole 7,Hole 8,Hole 9,Out,Hole 10,Hole 11,Hole 12,Hole 13,Hole 14,Hole 15,Hole 16,Hole 17,Hole 18,In,Total
S.I.,,,7,15,3,11,17,1,13,9,5,,10,4,12,2,8,16,6,18,14,
Par,,,4,3,4,4,3,4,5,4,4,35,3,4,4,4,4,5,4,3,4,35,70
Jesse Dodd,Black tee,Not set,4,5,4,3,4,6,5,3,3,37,4,4,4,7,4,4,3,3,4,37,74
,Scramble,,E,+2,E,-1,+1,+2,E,-1,-1,+2,+1,E,E,+3,E,-1,-1,E,E,+2,+4
Player 2,Black tee,4.8,4,5,4,3,4,6,5,3,3,37,4,4,4,7,4,4,3,3,4,37,74
,Scramble,,E,+2,E,-1,+1,+2,E,-1,-1,+2,+1,E,E,+3,E,-1,-1,E,E,+2,+4
Player 3,Black tee,1.9,4,4,4,4,3,4,4,4,3,34,4,5,4,7,4,4,3,3,5,39,73
,Scramble,,E,+1,E,E,E,E,-1,E,-1,-1,+1,+1,E,+3,E,-1,-1,E,+1,+4,+3
Player 4,Black tee,6.1,4,4,4,4,3,4,4,4,3,34,4,5,4,7,4,4,3,3,5,39,73
,Scramble,,E,+1,E,E,E,E,-1,E,-1,-1,+1,+1,E,+3,E,-1,-1,E,+1,+4,+3
`;

describe("parseSquabbitMatchCsv", () => {
  it("extracts the course, date, and all four players from a real export", () => {
    const parsed = parseSquabbitMatchCsv(REAL_COMPLETE_MATCH_CSV);
    expect(parsed.courseName).toBe("Champions Golf Course");
    expect(parsed.dateText).toBe("Aug 19, 2026 9:00 AM");
    expect(parsed.players.map((p) => p.name)).toEqual(["Jesse Dodd", "Player 2", "Player 3", "Player 4"]);
  });

  it("reads each player's Out/In/Total and format label correctly", () => {
    const parsed = parseSquabbitMatchCsv(REAL_COMPLETE_MATCH_CSV);
    const jesse = parsed.players[0]!;
    expect(jesse.out).toBe(37);
    expect(jesse.in).toBe(37);
    expect(jesse.total).toBe(74);
    expect(jesse.format).toBe("Scramble");
    expect(jesse.handicap).toBe("Not set");

    const player3 = parsed.players[2]!;
    expect(player3.out).toBe(34);
    expect(player3.in).toBe(39);
    expect(player3.total).toBe(73);
    expect(player3.handicap).toBe("1.9");
  });

  it("reads all 18 individual hole scores in order", () => {
    const parsed = parseSquabbitMatchCsv(REAL_COMPLETE_MATCH_CSV);
    expect(parsed.players[0]!.holes).toEqual([4, 5, 4, 3, 4, 6, 5, 3, 3, 4, 4, 4, 7, 4, 4, 3, 3, 4]);
  });

  it("returns an empty result for text with no hole header", () => {
    expect(parseSquabbitMatchCsv("not a scorecard")).toEqual({ courseName: null, dateText: null, players: [] });
  });
});

const PARTICIPANTS: MatchImportParticipant[] = [
  { playerId: "a1", playerName: "Jesse Dodd", side: "A" },
  { playerId: "a2", playerName: "Player 2", side: "A" },
  { playerId: "b1", playerName: "Player 3", side: "B" },
  { playerId: "b2", playerName: "Player 4", side: "B" },
];

describe("computeMatchImport", () => {
  it("derives all three segment winners from a completed match's Out/In/Total", () => {
    const parsed = parseSquabbitMatchCsv(REAL_COMPLETE_MATCH_CSV);
    const result = computeMatchImport(parsed, PARTICIPANTS);

    expect(result.courseName).toBe("Champions Golf Course");
    expect(result.matchStatus).toBe("COMPLETE");
    expect(result.unmatchedCsvPlayers).toEqual([]);
    expect(result.missingParticipants).toEqual([]);

    const [front9, back9, overall] = result.segments;
    // Team A (Jesse + Player 2) shot 37 on the front; Team B (Player 3 + 4) shot 34 — B wins.
    expect(front9).toMatchObject({ segmentName: "Front 9", teamAScore: 37, teamBScore: 34, winner: "B", status: "COMPLETE" });
    // Back 9: Team A 37, Team B 39 — A wins.
    expect(back9).toMatchObject({ segmentName: "Back 9", teamAScore: 37, teamBScore: 39, winner: "A", status: "COMPLETE" });
    // Overall: Team A 74, Team B 73 — B wins.
    expect(overall).toMatchObject({ segmentName: "Overall 18", teamAScore: 74, teamBScore: 73, winner: "B", status: "COMPLETE" });
  });

  it("matches player names case-insensitively", () => {
    const parsed = parseSquabbitMatchCsv(REAL_COMPLETE_MATCH_CSV);
    const lowercased = PARTICIPANTS.map((p) => ({ ...p, playerName: p.playerName.toLowerCase() }));
    const result = computeMatchImport(parsed, lowercased);
    expect(result.unmatchedCsvPlayers).toEqual([]);
  });

  it("flags CSV names that don't match any participant, and participants missing from the CSV", () => {
    const parsed = parseSquabbitMatchCsv(REAL_COMPLETE_MATCH_CSV);
    const withATypo: MatchImportParticipant[] = [
      { playerId: "a1", playerName: "Jesse Dod", side: "A" }, // typo — won't match "Jesse Dodd"
      { playerId: "a2", playerName: "Player 2", side: "A" },
      { playerId: "b1", playerName: "Player 3", side: "B" },
      { playerId: "b2", playerName: "Player 4", side: "B" },
    ];
    const result = computeMatchImport(parsed, withATypo);
    expect(result.unmatchedCsvPlayers).toEqual(["Jesse Dodd"]);
    expect(result.missingParticipants).toEqual(["Jesse Dod"]);
  });

  it("reports SCHEDULED and PENDING segments for a round with no holes played yet", () => {
    const noHoles = `
Airport Golf Course,"Aug 20, 2026 9:00 AM"
,,Handicap,Hole 1,Hole 2,Hole 3,Hole 4,Hole 5,Hole 6,Hole 7,Hole 8,Hole 9,Out,Hole 10,Hole 11,Hole 12,Hole 13,Hole 14,Hole 15,Hole 16,Hole 17,Hole 18,In,Total
S.I.,,,7,15,3,11,17,1,13,9,5,,10,4,12,2,8,16,6,18,14,
Par,,,4,3,4,4,3,4,5,4,4,35,3,4,4,4,4,5,4,3,4,35,70
Jesse Dodd,Black tee,Not set,,,,,,,,,,,,,,,,,,,,
,Team Match Play,,,,,,,,,,,,,,,,,,,,,
Player 2,Black tee,4.8,,,,,,,,,,,,,,,,,,,,
,Team Match Play,,,,,,,,,,,,,,,,,,,,,
Player 3,Black tee,1.9,,,,,,,,,,,,,,,,,,,,
,Team Match Play,,,,,,,,,,,,,,,,,,,,,
Player 4,Black tee,6.1,,,,,,,,,,,,,,,,,,,,
,Team Match Play,,,,,,,,,,,,,,,,,,,,,
`;
    const parsed = parseSquabbitMatchCsv(noHoles);
    const result = computeMatchImport(parsed, PARTICIPANTS);
    expect(result.matchStatus).toBe("SCHEDULED");
    for (const segment of result.segments) {
      expect(segment.status).toBe("PENDING");
      expect(segment.winner).toBeNull();
    }
  });

  it("reports IN_PROGRESS when the front 9 has some holes but no completed segment yet", () => {
    const partial = `
Airport Golf Course,"Aug 20, 2026 9:00 AM"
,,Handicap,Hole 1,Hole 2,Hole 3,Hole 4,Hole 5,Hole 6,Hole 7,Hole 8,Hole 9,Out,Hole 10,Hole 11,Hole 12,Hole 13,Hole 14,Hole 15,Hole 16,Hole 17,Hole 18,In,Total
S.I.,,,7,15,3,11,17,1,13,9,5,,10,4,12,2,8,16,6,18,14,
Par,,,4,3,4,4,3,4,5,4,4,35,3,4,4,4,4,5,4,3,4,35,70
Jesse Dodd,Black tee,Not set,4,5,4,,,,,,,,,,,,,,,,,,
,Team Match Play,,E,+2,E,,,,,,,,,,,,,,,,,,
Player 2,Black tee,4.8,4,5,4,,,,,,,,,,,,,,,,,,
,Team Match Play,,E,+2,E,,,,,,,,,,,,,,,,,,
Player 3,Black tee,1.9,,,,,,,,,,,,,,,,,,,,
,Team Match Play,,,,,,,,,,,,,,,,,,,,,
Player 4,Black tee,6.1,,,,,,,,,,,,,,,,,,,,
,Team Match Play,,,,,,,,,,,,,,,,,,,,,
`;
    const parsed = parseSquabbitMatchCsv(partial);
    const result = computeMatchImport(parsed, PARTICIPANTS);
    expect(result.matchStatus).toBe("IN_PROGRESS");
    const [front9, back9, overall] = result.segments;
    expect(front9.status).toBe("IN_PROGRESS");
    expect(front9.winner).toBeNull();
    expect(back9.status).toBe("PENDING");
    expect(overall.status).toBe("IN_PROGRESS"); // some hole data exists overall, even though no segment is finished
  });
});
