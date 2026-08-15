// Shared copy for "how the tournament works" — rendered on both the
// homepage (abbreviated) and /rules (in full), so the wording only lives
// here once.
export interface HowItWorksStep {
  title: string;
  body: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Four skill tiers",
    body: "All 32 players are ranked into four tiers of eight. Tiers keep every team balanced — there are no handicap strokes during matches, so the draft is what levels the field.",
  },
  {
    title: "Captains draft balanced teams",
    body: "Two captains build their rosters one tier at a time, so both teams end up with the same tier composition even though the individual players differ.",
  },
  {
    title: "Teams privately build pairings",
    body: "Each team splits its roster into 2-man pairings behind closed doors, without knowing how the opposing team has paired up.",
  },
  {
    title: "Captains match pairs against each other",
    body: "Pairings are matched up one at a time, alternating which captain sets the next matchup — a strategic phase all its own.",
  },
  {
    title: "Matches are played straight up",
    body: "No handicap strokes. Each 2v2 match is worth 3 points across a front-9 format, a back-9 format, and an overall 18-hole result.",
  },
  {
    title: "The losing half is eliminated",
    body: "Whichever team scores more total points across all of its matches advances. The other 16 (or 8, in Round 2) are eliminated — but stay visible in tournament history.",
  },
  {
    title: "Survivors are completely redrafted",
    body: "Nobody keeps their old team or partner. Surviving players are drafted again from scratch, still balanced by tier.",
  },
  {
    title: "Final 8 play a 4v4 championship",
    body: "The last 8 players split into two 4-man teams — one from each original tier — for a two-round championship: team matches, then singles.",
  },
];
