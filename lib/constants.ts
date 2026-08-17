// Central definitions for every "closed set of strings" field in the Prisma
// schema. SQLite has no native enum type (and we want the schema to work
// unmodified against Postgres in prod), so these unions + label maps are the
// single source of truth instead of `enum` — used for validation, <select>
// options, and display labels alike.

export const TOURNAMENT_STATUSES = [
  "REGISTRATION",
  "ROUND_1_DRAFT",
  "ROUND_1_IN_PROGRESS",
  "ROUND_2_DRAFT",
  "ROUND_2_IN_PROGRESS",
  "CHAMPIONSHIP",
  "COMPLETE",
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  REGISTRATION: "Registration",
  ROUND_1_DRAFT: "Round 1 Draft",
  ROUND_1_IN_PROGRESS: "Round 1 In Progress",
  ROUND_2_DRAFT: "Round 2 Draft",
  ROUND_2_IN_PROGRESS: "Round 2 In Progress",
  CHAMPIONSHIP: "Championship",
  COMPLETE: "Tournament Complete",
};

export const PLAYER_STATUSES = ["ACTIVE", "ELIMINATED", "CHAMPION"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const ROUND_STATUSES = ["PENDING", "ACTIVE", "COMPLETE"] as const;
export type RoundStatus = (typeof ROUND_STATUSES)[number];

export const MATCH_STATUSES = [
  "PAIRING_PENDING",
  "COURSE_SELECTION",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETE",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  PAIRING_PENDING: "Twosome Pending",
  COURSE_SELECTION: "Course Selection",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

// Tailwind classes for status pills, kept alongside the labels so every
// place a status is rendered stays visually consistent.
export const MATCH_STATUS_STYLES: Record<MatchStatus, string> = {
  PAIRING_PENDING: "bg-stone-200 text-stone-700",
  COURSE_SELECTION: "bg-amber-100 text-amber-800",
  SCHEDULED: "bg-sky-100 text-sky-800",
  IN_PROGRESS: "bg-emerald-100 text-emerald-800",
  COMPLETE: "bg-fairway-900 text-cream-50",
};

export const SEGMENT_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETE"] as const;
export type SegmentStatus = (typeof SEGMENT_STATUSES)[number];

export const MATCH_FORMATS = [
  "SCRAMBLE",
  "SHAMBLE",
  "BEST_BALL",
  "ALTERNATE_SHOT",
  "SINGLES",
  "SUDDEN_DEATH_SCRAMBLE",
  "OVERALL",
] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export const SIDES = ["A", "B"] as const;
export type Side = (typeof SIDES)[number];

export const WINNERS = ["A", "B", "TIE"] as const;
export type Winner = (typeof WINNERS)[number];

export const TOURNAMENT_STATUS_DESCRIPTIONS: Record<TournamentStatus, string> = {
  REGISTRATION: "Players are locking in their spots for the 32-player field.",
  ROUND_1_DRAFT: "Captains are drafting two balanced 16-player Round 1 rosters.",
  ROUND_1_IN_PROGRESS: "All 32 players are competing in Round 1 matches. 16 will survive.",
  ROUND_2_DRAFT: "The Round 1 survivors are being completely redrafted for Round 2.",
  ROUND_2_IN_PROGRESS: "16 players are competing in Round 2 matches. 8 will survive.",
  CHAMPIONSHIP: "The Final 8 are competing in the 4v4 championship for the title.",
  COMPLETE: "The tournament is complete and the champions have been crowned.",
};

/** The 4-node "32 -> 16 -> 8 -> 4 Champions" ladder shown on the homepage,
 * one stage per round: Round 1, Round 2, Championship, Champions. */
export const PROGRESSION_STAGES = ["32 Players", "16 Players", "8 Players", "4 Champions"] as const;

export function getProgressionStageIndex(status: TournamentStatus): number {
  switch (status) {
    case "REGISTRATION":
    case "ROUND_1_DRAFT":
    case "ROUND_1_IN_PROGRESS":
      return 0;
    case "ROUND_2_DRAFT":
    case "ROUND_2_IN_PROGRESS":
      return 1;
    case "CHAMPIONSHIP":
      return 2;
    case "COMPLETE":
      return 3;
    default:
      return 0;
  }
}

export const ROUND_NUMBERS = {
  ROUND_1: 1,
  ROUND_2: 2,
  CHAMPIONSHIP: 3,
} as const;

export const TIER_COUNT = 4;
export const PLAYERS_PER_TIER_START = 8;
