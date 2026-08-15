import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { RuleSection } from "@/components/rules/rule-section";
import { FORMAT_LIST } from "@/lib/formats";

export const metadata = { title: "Rules" };

const SECTIONS = [
  { id: "concept", title: "Tournament Concept" },
  { id: "tiers", title: "Skill Tiers" },
  { id: "draft", title: "Draft Rules" },
  { id: "strategy", title: "Strategy Phase" },
  { id: "pairs", title: "Pair Construction" },
  { id: "matchmaking", title: "Alternating Matchmaking" },
  { id: "round-1", title: "Round 1" },
  { id: "round-2", title: "Round 2" },
  { id: "championship", title: "Championship" },
  { id: "formats", title: "Match Formats" },
  { id: "scoring", title: "Three-Point Scoring" },
  { id: "tiebreakers", title: "Tiebreakers" },
  { id: "course-selection", title: "Course Selection" },
  { id: "scheduling", title: "Scheduling" },
  { id: "live-scoring", title: "Live Scoring" },
  { id: "prize-pool", title: "Prize Pool" },
];

export default function RulesPage() {
  return (
    <div>
      <PageHeader title="Tournament Rules" subtitle="The complete structure, start to finish. No handicap strokes, no shortcuts." />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_1fr]">
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700/40">On this page</p>
              {SECTIONS.map((s, i) => (
                <Link
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-ink-700/60 hover:bg-fairway-50 hover:text-fairway-900"
                >
                  {i + 1}. {s.title}
                </Link>
              ))}
            </div>
          </nav>

          <div className="min-w-0">
            <RuleSection id="concept" number={1} title="Tournament Concept">
              <p>
                The tournament begins with 32 golfers, divided into four skill tiers of eight. There are no
                handicap strokes at any point during matches — the tiered draft system is what keeps teams
                balanced, not strokes given on the course.
              </p>
              <p>
                The field is cut in half twice: 32 players become 16, then 16 become 8. The survivors are then
                redrafted into two 4-player championship teams for a 36-hole final. Eliminated players are never
                removed from the site — their tournament history stays visible permanently.
              </p>
            </RuleSection>

            <RuleSection id="tiers" number={2} title="Skill Tiers">
              <p>
                All 32 players are ranked into four tiers of eight, from strongest (Tier 1) to most developing
                (Tier 4). Tiers exist purely to keep the draft balanced — every team in every round ends up with an
                even spread across all four tiers, so no team is stacked with the strongest (or weakest) players.
              </p>
              <p>
                A player&apos;s handicap index may be shown on their profile for informational purposes only. It has
                no effect on scoring, strokes, or match outcomes at any point in the tournament.
              </p>
            </RuleSection>

            <RuleSection id="draft" number={3} title="Draft Rules">
              <p>
                Two captains draft balanced rosters one tier at a time, so both teams finish with an identical tier
                composition even though the individual players differ:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Round 1 draft:</strong> Team A and Team B each draft 4 players from every tier — 16
                  players per team, 32 total.
                </li>
                <li>
                  <strong>Round 2 draft:</strong> the 16 survivors are completely redrafted. Team A and Team B each
                  draft 2 players from every tier — 8 players per team.
                </li>
                <li>
                  <strong>Championship draft:</strong> the final 8 are split into two 4-player teams, each getting
                  exactly one player from each of the four original tiers.
                </li>
              </ul>
              <p>Nobody keeps their previous team or partner between rounds — every draft starts from scratch.</p>
            </RuleSection>

            <RuleSection id="strategy" number={4} title="Strategy Phase">
              <p>
                Once a team&apos;s roster is set, the team privately decides how to split its players into 2-man
                pairings — without knowing how the opposing team has paired up. This is where team strategy really
                begins: a captain might pair two strong players together to win outright, or spread strength across
                every pairing to avoid a bad matchup.
              </p>
            </RuleSection>

            <RuleSection id="pairs" number={5} title="Pair Construction">
              <p>
                Round 1 teams build eight 2-man pairings from their 16 players. Round 2 teams build four pairings
                from their 8 players. Once a team finalizes its pairings, they are locked — pairings cannot be
                rearranged once the matchmaking phase begins.
              </p>
            </RuleSection>

            <RuleSection id="matchmaking" number={6} title="Alternating Matchmaking">
              <p>
                With both teams&apos; pairings locked, captains alternate setting up the actual matches. The
                sequence goes back and forth:
              </p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Team A announces one of its locked pairs.</li>
                <li>Team B chooses one of its own locked pairs to play against it.</li>
                <li>Team B then announces a different locked pair.</li>
                <li>Team A chooses one of its remaining pairs to play against it.</li>
                <li>Play continues, alternating, until every pairing has an opponent.</li>
              </ol>
              <p>
                This is a genuine strategic phase — captains can try to hunt for favorable matchups or protect a
                strong pairing by holding it back.
              </p>
            </RuleSection>

            <RuleSection id="round-1" number={7} title="Round 1 — 32 to 16">
              <p>
                Round 1 produces eight 2v2 matches. Each match is worth 3 total points: 1 for the front-9 (2-man
                scramble), 1 for the back-9 (2-man shamble), and 1 for the overall 18-hole result. The team with the
                most total points across all eight matches advances; the losing 16 players are eliminated (but
                remain visible in tournament history).
              </p>
              <p>
                If the overall team score ends tied, the two captains play a straight-up singles match to decide
                who advances.
              </p>
            </RuleSection>

            <RuleSection id="round-2" number={8} title="Round 2 — 16 to 8">
              <p>
                The 16 survivors are completely redrafted into two new 8-player teams. Teams again build locked
                pairings and go through the same alternating matchmaking process, producing four 2v2 matches. Each
                match is worth 3 points: 1 for the front-9 (best ball), 1 for the back-9 (alternate shot), and 1 for
                the overall 18-hole result. The winning eight advance; a tie is again settled by a captain-vs-captain
                playoff.
              </p>
            </RuleSection>

            <RuleSection id="championship" number={9} title="Championship — Final 8">
              <p>
                The last 8 players are redrafted one final time into two 4-player teams, each getting exactly one
                player from every original skill tier. The championship spans roughly 36 holes:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>First 18:</strong> two 2v2 team matches.
                </li>
                <li>
                  <strong>Second 18:</strong> four 1v1 singles matches.
                </li>
              </ul>
              <p>
                The exact point values for the championship are configured by the tournament administrator rather
                than hardcoded, since the format may evolve. If the championship ends tied, the tiebreaker is a 4v4
                sudden-death scramble — all four players on each team combine into one scramble team and play
                until someone wins a hole. The four golfers on the winning team split the tournament prize pool.
              </p>
            </RuleSection>

            <RuleSection id="formats" number={10} title="Match Formats">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {FORMAT_LIST.map((f) => (
                  <div key={f.id} className="rounded-xl border border-fairway-900/10 bg-fairway-50/40 p-4">
                    <p className="font-display text-lg font-bold text-fairway-900">{f.label}</p>
                    <p className="mt-1 text-sm text-ink-700/70">{f.description}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gold-600">{f.usedIn}</p>
                  </div>
                ))}
              </div>
            </RuleSection>

            <RuleSection id="scoring" number={11} title="Three-Point Scoring">
              <p>
                Every 2v2 match in Round 1 and Round 2 is worth 3 total points, split across three segments (front
                9, back 9, and the overall 18-hole result). Each segment awards its point to whichever side wins it
                outright; a tied segment splits the point evenly (0.5 apiece) rather than awarding it to neither
                side.
              </p>
              <p>
                For example, if Team A wins the front 9 and the overall result but loses the back 9, the match
                total reads <strong>Team A 2 — Team B 1</strong>. Round totals are simply the sum of every match&apos;s
                points — with 8 matches in Round 1, the full round is worth 24 points, so a final score like{" "}
                <strong>Team A 13.5 — Team B 10.5</strong> is a normal result once a segment or two has been tied.
              </p>
            </RuleSection>

            <RuleSection id="tiebreakers" number={12} title="Tiebreakers">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Round 1 or Round 2 tied on points:</strong> the two team captains play a straight-up
                  singles match; the winner&apos;s team advances.
                </li>
                <li>
                  <strong>Championship tied after both 18-hole segments:</strong> a 4v4 sudden-death scramble — the
                  first team to win a hole wins the tournament.
                </li>
              </ul>
            </RuleSection>

            <RuleSection id="course-selection" number={13} title="Course Selection">
              <p>
                The tournament administrator maintains a list of approved courses. For any match without a course
                yet, each of the four players can submit their preferred course from that approved list on the{" "}
                <Link href="/courses" className="font-semibold text-fairway-700 hover:text-fairway-900">
                  Course Selection
                </Link>{" "}
                page.
              </p>
              <p>
                When it&apos;s time to decide, hitting <strong>Randomize Course</strong> draws randomly from a pool
                built out of every submitted selection — one entry per player, so a course picked by multiple
                players is proportionally more likely to be drawn. For example:
              </p>
              <div className="rounded-xl border border-fairway-900/10 bg-fairway-50/40 p-4 text-sm">
                <p>John → Course A · Mike → Course A · Steve → Course B · Chris → Course C</p>
                <p className="mt-1 font-semibold text-fairway-800">Draw pool: Course A, Course A, Course B, Course C</p>
                <p className="mt-1 text-ink-700/60">Course A has a 50% chance of being selected — this is intentional.</p>
              </div>
            </RuleSection>

            <RuleSection id="scheduling" number={14} title="Scheduling">
              <p>Every match moves through a simple status lifecycle as it&apos;s organized and played:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  <strong>Pairing Pending</strong> — the matchup hasn&apos;t been set via alternating matchmaking
                  yet.
                </li>
                <li>
                  <strong>Course Selection</strong> — the four players are agreeing on where to play.
                </li>
                <li>
                  <strong>Scheduled</strong> — a course and date are locked in.
                </li>
                <li>
                  <strong>In Progress</strong> — the match is currently being played.
                </li>
                <li>
                  <strong>Complete</strong> — all three segments are decided and points are final.
                </li>
              </ol>
            </RuleSection>

            <RuleSection id="live-scoring" number={15} title="Live Scoring">
              <p>
                Players may use a third-party app like Golf GameBook to record live, shot-by-shot scoring during a
                round. When a match has a live scoring link attached, a <strong>Follow Match Live</strong> button
                appears on that match — it opens the external scoring app in a new tab.
              </p>
              <p>
                This site remains the official source of truth for team rosters, pairings, advancement,
                eliminations, tournament points, and final results, regardless of what any third-party scoring app
                shows.
              </p>
            </RuleSection>

            <RuleSection id="prize-pool" number={16} title="Prize Pool">
              <p>
                The prize pool grows as players lock in their entry fee and is displayed live on the homepage,
                along with the entry fee, number of paid players, and the championship split size — all editable by
                the tournament administrator as the season progresses.
              </p>
              <p>
                At the end of the championship, the prize pool is split evenly among the four players on the
                winning team.
              </p>
            </RuleSection>
          </div>
        </div>
      </div>
    </div>
  );
}
