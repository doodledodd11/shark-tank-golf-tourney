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
    body: "All 32 players are ranked into four tiers of eight. Tiers are a guide for building a balanced roster, not a requirement. There are no handicap strokes during matches, so the draft is what levels the field.",
  },
  {
    title: "Captains draft their own teams",
    body: "Two captains alternate picks, turn by turn, choosing any undrafted player from any tier. Tier counts are shown as a recommended target for balance, but a captain can lean into a tier that's proving itself.",
  },
  {
    title: "Teams privately build twosomes",
    body: "Each team splits its roster into 2-man twosomes behind closed doors, without knowing how the opposing team has grouped its own.",
  },
  {
    title: "Captains match twosomes against each other",
    body: "Twosomes are matched up one at a time, alternating which captain sets the next matchup, a strategic phase all its own.",
  },
  {
    title: "Matches are played straight up",
    body: "No handicap strokes. Each 2v2 match is worth 3 points across a front-9 format, a back-9 format, and an overall 18-hole result.",
  },
  {
    title: "The losing half is eliminated",
    body: "Whichever team scores more total points across all of its matches advances. The other 16 (or 8, in Round 2) are eliminated, but stay visible in tournament history.",
  },
  {
    title: "Survivors are completely redrafted",
    body: "Nobody keeps their old team or partner. Surviving players are drafted again from scratch, with tiers again used only as a recommended guide.",
  },
  {
    title: "Final 8 play a 4v4 championship",
    body: "The last 8 players split into two 4-man teams for a two-round championship: team matches, then singles.",
  },
];
