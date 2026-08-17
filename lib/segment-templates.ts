// Default MatchSegment sets used when an admin creates a new match. These
// are only a starting point — every field is editable afterward on the
// match's admin edit page, which is what keeps the championship's format
// "evolvable" per the tournament spec rather than hardcoded.
export interface SegmentTemplateItem {
  name: string;
  format: string;
  holes: string;
  order: number;
  pointsAvailable: number;
}

export const SEGMENT_TEMPLATES: Record<string, SegmentTemplateItem[]> = {
  ROUND_1: [
    { name: "Front 9", format: "SCRAMBLE", holes: "1-9", order: 1, pointsAvailable: 1 },
    { name: "Back 9", format: "SHAMBLE", holes: "10-18", order: 2, pointsAvailable: 1 },
    { name: "Overall 18", format: "OVERALL", holes: "1-18", order: 3, pointsAvailable: 1 },
  ],
  ROUND_2: [
    { name: "Front 9", format: "BEST_BALL", holes: "1-9", order: 1, pointsAvailable: 1 },
    { name: "Back 9", format: "ALTERNATE_SHOT", holes: "10-18", order: 2, pointsAvailable: 1 },
    { name: "Overall 18", format: "OVERALL", holes: "1-18", order: 3, pointsAvailable: 1 },
  ],
  CHAMPIONSHIP_TEAM: [{ name: "Team Match", format: "BEST_BALL", holes: "1-18", order: 1, pointsAvailable: 1 }],
  CHAMPIONSHIP_SINGLES: [{ name: "Singles Match", format: "SINGLES", holes: "1-18", order: 1, pointsAvailable: 1 }],
  PLAYOFF: [{ name: "Captain Playoff", format: "SINGLES", holes: "1-18", order: 1, pointsAvailable: 1 }],
  SUDDEN_DEATH: [
    { name: "Sudden Death", format: "SUDDEN_DEATH_SCRAMBLE", holes: "Sudden Death", order: 1, pointsAvailable: 1 },
  ],
};

export const SEGMENT_TEMPLATE_LABELS: Record<keyof typeof SEGMENT_TEMPLATES, string> = {
  ROUND_1: "Round 1 (Scramble / Shamble / Overall)",
  ROUND_2: "Round 2 (Best Ball / Alternate Shot / Overall)",
  CHAMPIONSHIP_TEAM: "Championship, Team Match (2v2)",
  CHAMPIONSHIP_SINGLES: "Championship, Singles (1v1)",
  PLAYOFF: "Captain Playoff (1v1)",
  SUDDEN_DEATH: "Sudden-Death Scramble (4v4)",
};
