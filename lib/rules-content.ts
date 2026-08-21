// Shared copy for "how the tournament works" — rendered on both the
// homepage (abbreviated) and /rules (in full), so the wording only lives
// here once.
export interface HowItWorksStep {
  title: string;
  body: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Four skill tiers, seeded within each",
    body: "All 32 players are ranked into four tiers of eight, and seeded 1-8 within their own tier from GHIN/handicap data. Tiers are a guide for building a balanced roster, not a requirement. There are no handicap strokes during matches, so the draft is what levels the field.",
  },
  {
    title: "Captains draft their own teams",
    body: "The worse-seeded captain (lowest tier, then highest seed within it) picks first. If the two captains are in different tiers, each is also automatically seated with one bonus teammate: whoever holds their own seed number in the other captain's tier. From there, picks run as a snake: the first captain picks once (any tier), the other captain then mirrors that exact tier for their reply, then it's a free pick again, mirrored again, and so on — the standard way to even out the advantage of picking first while still keeping both rosters balanced across tiers.",
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
    body: "The last 8 players split into two 4-man teams for a two-round championship: two 2v2 team matches (drawn at random from each team's locked twosomes), then four 1v1 singles matches, paired by seed rank within each team's own roster — best vs best, 2nd-best vs 2nd-best, and so on.",
  },
];
