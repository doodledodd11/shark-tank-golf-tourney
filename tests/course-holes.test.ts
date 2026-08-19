import { describe, expect, it } from "vitest";
import { parseCourseHolesFromCsv } from "@/lib/course-holes";

// A real export sample (see the Squabbit research conversation) — only the
// header/S.I./Par rows matter here, player rows are irrelevant noise.
const REAL_SAMPLE = `
Champions Golf Course,"Aug 19, 2026 9:00 AM"
,,Handicap,Hole 1,Hole 2,Hole 3,Hole 4,Hole 5,Hole 6,Hole 7,Hole 8,Hole 9,Out,Hole 10,Hole 11,Hole 12,Hole 13,Hole 14,Hole 15,Hole 16,Hole 17,Hole 18,In,Total
S.I.,,,7,15,3,11,17,1,13,9,5,,10,4,12,2,8,16,6,18,14,
Par,,,4,3,4,4,3,4,5,4,4,35,3,4,4,4,4,5,4,3,4,35,70
Jesse Dodd,Black tee,Not set,4,5,4,3,4,6,5,3,3,37,4,4,4,7,4,4,3,3,4,37,74
,Scramble,,E,+2,E,-1,+1,+2,E,-1,-1,+2,+1,E,E,+3,E,-1,-1,E,E,+2,+4
`;

describe("parseCourseHolesFromCsv", () => {
  it("extracts par and stroke index for all 18 holes from a real export", () => {
    const result = parseCourseHolesFromCsv(REAL_SAMPLE);
    expect(result).toEqual({
      parByHole: [4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 4, 4, 4, 5, 4, 3, 4],
      strokeIndexByHole: [7, 15, 3, 11, 17, 1, 13, 9, 5, 10, 4, 12, 2, 8, 16, 6, 18, 14],
    });
  });

  it("returns null for text with no hole header", () => {
    expect(parseCourseHolesFromCsv("just some random text\nwith no scorecard in it")).toBeNull();
  });

  it("returns null if the Par row is missing or incomplete", () => {
    const brokenPar = REAL_SAMPLE.replace("Par,,,4,3,4,4,3,4,5,4,4,35,3,4,4,4,4,5,4,3,4,35,70", "Par,,,4,3,4,,,,,,,,,,,,,,,,,");
    expect(parseCourseHolesFromCsv(brokenPar)).toBeNull();
  });
});
