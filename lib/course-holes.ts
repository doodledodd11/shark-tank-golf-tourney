// Parses a single field out of the same CSV shape a Squabbit round export
// uses — an admin does this once per course (export any round played
// there) purely to pull in that course's par and stroke-index per hole,
// which the live scorecard shows as reference while a player enters their
// own strokes. Nothing else from that export (players, actual scores) is
// read or stored — this is a one-time course-data bootstrap, not an
// ongoing integration.

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

export interface ParsedCourseHoles {
  parByHole: number[]; // 18 entries, hole 1 first
  strokeIndexByHole: number[];
}

/** Returns null if the pasted text doesn't look like a hole-by-hole
 * scorecard export (no "Hole 1" header found) or the S.I./Par rows right
 * after it aren't complete, valid numbers for all 18 holes — callers
 * should treat null as "couldn't read that," not throw. */
export function parseCourseHolesFromCsv(csvText: string): ParsedCourseHoles | null {
  const lines = csvText.split(/\r?\n/);
  const headerIdx = lines.findIndex((line) => parseCsvLine(line).includes("Hole 1"));
  if (headerIdx === -1) return null;

  const headerFields = parseCsvLine(lines[headerIdx]!);
  const hole1Idx = headerFields.indexOf("Hole 1");
  const outIdx = headerFields.indexOf("Out");
  if (hole1Idx === -1 || outIdx === -1) return null;
  const backStartIdx = outIdx + 1;

  // The known export shape: header row, then S.I., then Par, in that order.
  const siFields = parseCsvLine(lines[headerIdx + 1] ?? "");
  const parFields = parseCsvLine(lines[headerIdx + 2] ?? "");

  function readNine(fields: string[], start: number): number[] | null {
    const slice = fields.slice(start, start + 9).map((f) => Number(f.trim()));
    if (slice.length !== 9 || slice.some((n) => !Number.isFinite(n) || n <= 0)) return null;
    return slice;
  }

  const frontPar = readNine(parFields, hole1Idx);
  const backPar = readNine(parFields, backStartIdx);
  const frontSi = readNine(siFields, hole1Idx);
  const backSi = readNine(siFields, backStartIdx);
  if (!frontPar || !backPar || !frontSi || !backSi) return null;

  return { parByHole: [...frontPar, ...backPar], strokeIndexByHole: [...frontSi, ...backSi] };
}
