import type { MatchFormat } from "./constants";

export interface FormatInfo {
  id: MatchFormat;
  label: string;
  tagline: string;
  description: string;
  usedIn: string;
}

// Single source of truth for match-format copy. Both the homepage "Match
// Formats" cards and the /rules page render from this list, so the wording
// only ever lives in one place.
export const FORMAT_INFO: Record<MatchFormat, FormatInfo> = {
  SCRAMBLE: {
    id: "SCRAMBLE",
    label: "Scramble",
    tagline: "Both hit. Pick the best. Everyone plays it.",
    description:
      "Both players on a team tee off, then the team selects the better of the two shots. Both players then play their next shot from that spot, and the process repeats until the ball is holed. One score per team per hole.",
    usedIn: "Round 1 — Front 9",
  },
  SHAMBLE: {
    id: "SHAMBLE",
    label: "Shamble",
    tagline: "Best drive, then every player for themselves.",
    description:
      "Both players tee off. The team selects its preferred tee shot. Both players then play their own ball from that location through the completion of the hole. The lower score between the two players is the team's score.",
    usedIn: "Round 1 — Back 9",
  },
  BEST_BALL: {
    id: "BEST_BALL",
    label: "Best Ball",
    tagline: "Two balls in play, lowest score counts.",
    description:
      "Each player plays their own ball for the entire hole. The lower of the two individual scores becomes the team's score for that hole.",
    usedIn: "Round 2 — Front 9",
  },
  ALTERNATE_SHOT: {
    id: "ALTERNATE_SHOT",
    label: "Alternate Shot",
    tagline: "One ball. Alternating swings. Total trust.",
    description:
      "Partners play a single ball, alternating shots until the hole is complete. One player tees off on odd holes, the other on even holes, regardless of who made the previous shot.",
    usedIn: "Round 2 — Back 9",
  },
  SINGLES: {
    id: "SINGLES",
    label: "Singles Match Play",
    tagline: "One on one. No teammate to lean on.",
    description:
      "A traditional head-to-head match. Each player plays their own ball for all 18 holes; the lower score wins the hole, and the match is decided hole by hole, not by total strokes.",
    usedIn: "Championship — Round 2",
  },
  SUDDEN_DEATH_SCRAMBLE: {
    id: "SUDDEN_DEATH_SCRAMBLE",
    label: "Sudden Death Scramble",
    tagline: "4v4. Sudden death. Winner takes the pool.",
    description:
      "If the championship ends tied, all four players on each team combine into a single scramble team. Teams play hole by hole until one team wins a hole outright.",
    usedIn: "Championship — Tiebreaker",
  },
  OVERALL: {
    id: "OVERALL",
    label: "Overall 18",
    tagline: "Full-round gross score. A third, independent point.",
    description:
      "The pairing's combined gross score across all 18 holes, compared straight up against the opposing pairing's — independent of who won the front-9 and back-9 matches. Lower total wins the point.",
    usedIn: "Round 1 & Round 2 — Overall",
  },
};

export const FORMAT_LIST = Object.values(FORMAT_INFO);
