// Pure helpers for round-tripping player/match data with Squabbit
// (app.squabbitgolf.com) — a free, no-account third-party scoring app used
// to give players a live-following link per match (see gameBookEventUrl on
// Match for the same idea with Golf GameBook). Kept free of I/O so both
// directions are unit-testable: lib/actions/squabbit.ts wraps these with
// the actual Prisma reads/writes and admin auth.

// --------------------------------------------------------------------------
// Export: our roster -> Squabbit's "Users import" CSV format.
// --------------------------------------------------------------------------

/** We only ever store one `name` field (see Player.name), but Squabbit's
 * import requires First and Last separately. Splits on the first space —
 * right for "Player 01" and ordinary two-word names, imperfect for anyone
 * with a multi-word first name (best-effort, not a real name parser). */
export function splitName(name: string): { first: string; last: string } {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { first: trimmed, last: trimmed };
  return { first: trimmed.slice(0, spaceIndex), last: trimmed.slice(spaceIndex + 1) };
}

export interface SquabbitPlayerInput {
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  whsId: string | null;
  handicapIndex: number | null;
  teamName: string | null;
  preferredTee: string | null;
  transport: string | null;
}

function csvField(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(fields: (string | number | null)[]): string {
  return fields.map(csvField).join(",");
}

const SQUABBIT_PLAYERS_HEADER = "First,Last,Email,Phone,Gender,WHS ID,Handicap,Team,Tee,Registered,Transport";

/** Builds Squabbit's player-import CSV from a round's roster. `Registered`
 * is always left blank — we have no way of knowing whether a given player
 * already has a Squabbit account, and guessing "No" for real players (as
 * opposed to placeholder test data) would be actively misleading. */
export function buildSquabbitPlayersCsv(players: SquabbitPlayerInput[]): string {
  const lines = [SQUABBIT_PLAYERS_HEADER];
  for (const p of players) {
    const { first, last } = splitName(p.name);
    lines.push(
      csvRow([first, last, p.email, p.phone, p.gender, p.whsId, p.handicapIndex, p.teamName, p.preferredTee, "", p.transport]),
    );
  }
  return lines.join("\n") + "\n";
}

// --------------------------------------------------------------------------
// Import: Squabbit's per-match scorecard export -> our Match/MatchSegment.
//
// Squabbit can't split a single round's front 9 and back 9 into two
// different formats, so a real match on our side (Front 9 Scramble, Back 9
// Shamble, Overall 18) becomes one Squabbit round with an aggregate score
// per player. We use that round's Out/In/Total the same way — Out feeds our
// "Front 9" segment, In feeds "Back 9", Total feeds "Overall 18" — so the
// three segments still get a real, comparable result each, just without
// Squabbit knowing the format changed partway through.
// --------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  fields.push(cur);
  return fields;
}

function parseNumber(s: string | undefined): number | null {
  const t = (s ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface SquabbitMatchCsvPlayer {
  name: string;
  tee: string | null;
  handicap: string | null;
  format: string | null;
  holes: (number | null)[]; // 18 entries, front 9 then back 9
  out: number | null;
  in: number | null;
  total: number | null;
}

export interface ParsedSquabbitMatchCsv {
  courseName: string | null;
  dateText: string | null;
  players: SquabbitMatchCsvPlayer[];
}

/** Parses one Squabbit round/match export — the format shown in this repo's
 * research (a course/date header, an S.I. row, a Par row, then a pair of
 * rows — strokes, then format + vs-par — per player). Tolerant of the
 * export either standing alone (leading blank line) or sitting inside a
 * full tournament export (preceded by "Round N" and other sections),
 * since it locates the hole-header row by content rather than a fixed
 * line number. */
export function parseSquabbitMatchCsv(csvText: string): ParsedSquabbitMatchCsv {
  const lines = csvText.split(/\r?\n/);

  const headerIdx = lines.findIndex((line) => parseCsvLine(line).includes("Hole 1"));
  if (headerIdx === -1) {
    return { courseName: null, dateText: null, players: [] };
  }
  const headerFields = parseCsvLine(lines[headerIdx]!);
  const hole1Idx = headerFields.indexOf("Hole 1");
  const outIdx = headerFields.indexOf("Out");
  const inIdx = headerFields.indexOf("In");
  const totalIdx = headerFields.indexOf("Total");
  const backStartIdx = outIdx + 1;

  let courseName: string | null = null;
  let dateText: string | null = null;
  for (let i = headerIdx - 1; i >= 0; i--) {
    const fields = parseCsvLine(lines[i]!).map((f) => f.trim());
    if (fields.length === 2 && fields[0] && fields[1]) {
      [courseName, dateText] = fields as [string, string];
      break;
    }
    if (fields.some((f) => f !== "")) break; // hit an unrelated non-blank line first
  }

  const players: SquabbitMatchCsvPlayer[] = [];
  for (let i = headerIdx + 3; i + 1 < lines.length; i += 2) {
    const strokesFields = parseCsvLine(lines[i]!);
    const name = strokesFields[0]?.trim();
    if (!name) break; // blank line = end of this round's player list

    const formatFields = parseCsvLine(lines[i + 1]!);
    const frontHoles = strokesFields.slice(hole1Idx, hole1Idx + 9).map(parseNumber);
    const backHoles = strokesFields.slice(backStartIdx, backStartIdx + 9).map(parseNumber);

    players.push({
      name,
      tee: strokesFields[1]?.trim() || null,
      handicap: strokesFields[2]?.trim() || null,
      format: formatFields[1]?.trim() || null,
      holes: [...frontHoles, ...backHoles],
      out: parseNumber(strokesFields[outIdx]),
      in: parseNumber(strokesFields[inIdx]),
      total: parseNumber(strokesFields[totalIdx]),
    });
  }

  return { courseName, dateText, players };
}

export interface MatchImportParticipant {
  playerId: string;
  playerName: string;
  side: "A" | "B";
}

export interface SegmentImportResult {
  segmentName: "Front 9" | "Back 9" | "Overall 18";
  teamAScore: number | null;
  teamBScore: number | null;
  winner: "A" | "B" | "TIE" | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE";
}

export interface MatchImportResult {
  courseName: string | null;
  dateText: string | null;
  segments: [SegmentImportResult, SegmentImportResult, SegmentImportResult];
  matchStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETE";
  unmatchedCsvPlayers: string[];
  missingParticipants: string[];
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0) / present.length;
}

function buildSegment(
  segmentName: SegmentImportResult["segmentName"],
  teamAAggregates: (number | null)[],
  teamBAggregates: (number | null)[],
  teamAAnyHole: boolean,
  teamBAnyHole: boolean,
): SegmentImportResult {
  const teamAScore = average(teamAAggregates);
  const teamBScore = average(teamBAggregates);
  if (teamAScore != null && teamBScore != null) {
    const winner = teamAScore < teamBScore ? "A" : teamBScore < teamAScore ? "B" : "TIE";
    return { segmentName, teamAScore, teamBScore, winner, status: "COMPLETE" };
  }
  if (teamAAnyHole || teamBAnyHole) {
    return { segmentName, teamAScore: null, teamBScore: null, winner: null, status: "IN_PROGRESS" };
  }
  return { segmentName, teamAScore: null, teamBScore: null, winner: null, status: "PENDING" };
}

/** Matches a parsed Squabbit export against a real match's four
 * participants (by exact, case-insensitive name) and derives what our
 * three segments (and the match's own status) should become. Never
 * touches the database itself — see applySquabbitMatchImport for that —
 * so the caller can show this as a preview before anything is saved. */
export function computeMatchImport(
  parsed: ParsedSquabbitMatchCsv,
  participants: MatchImportParticipant[],
): MatchImportResult {
  const bySide: Record<"A" | "B", SquabbitMatchCsvPlayer[]> = { A: [], B: [] };
  const unmatchedCsvPlayers: string[] = [];
  const matchedParticipantIds = new Set<string>();

  for (const csvPlayer of parsed.players) {
    const match = participants.find((p) => p.playerName.trim().toLowerCase() === csvPlayer.name.trim().toLowerCase());
    if (!match) {
      unmatchedCsvPlayers.push(csvPlayer.name);
      continue;
    }
    matchedParticipantIds.add(match.playerId);
    bySide[match.side].push(csvPlayer);
  }

  const missingParticipants = participants.filter((p) => !matchedParticipantIds.has(p.playerId)).map((p) => p.playerName);

  const anyHole = (players: SquabbitMatchCsvPlayer[], range: [number, number]) =>
    players.some((p) => p.holes.slice(range[0], range[1]).some((h) => h != null));

  const front9 = buildSegment(
    "Front 9",
    bySide.A.map((p) => p.out),
    bySide.B.map((p) => p.out),
    anyHole(bySide.A, [0, 9]),
    anyHole(bySide.B, [0, 9]),
  );
  const back9 = buildSegment(
    "Back 9",
    bySide.A.map((p) => p.in),
    bySide.B.map((p) => p.in),
    anyHole(bySide.A, [9, 18]),
    anyHole(bySide.B, [9, 18]),
  );
  const overall = buildSegment(
    "Overall 18",
    bySide.A.map((p) => p.total),
    bySide.B.map((p) => p.total),
    anyHole(bySide.A, [0, 18]),
    anyHole(bySide.B, [0, 18]),
  );

  const matchStatus: MatchImportResult["matchStatus"] =
    overall.status === "COMPLETE" ? "COMPLETE" : [front9, back9, overall].some((s) => s.status !== "PENDING") ? "IN_PROGRESS" : "SCHEDULED";

  return {
    courseName: parsed.courseName,
    dateText: parsed.dateText,
    segments: [front9, back9, overall],
    matchStatus,
    unmatchedCsvPlayers,
    missingParticipants,
  };
}
