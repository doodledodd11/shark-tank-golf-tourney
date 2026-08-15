import { Handshake, Users2 } from "lucide-react";
import { RoundScoreBanner } from "./round-score-banner";
import { TeamRoster } from "./team-roster";
import { MatchDetailCard } from "./match-detail-card";
import { EmptyState } from "@/components/shared/empty-state";
import { calculateRoundTotals } from "@/lib/tournament-logic";
import type { RoundWithDetails } from "@/lib/data";

export function RoundSection({ round }: { round: RoundWithDetails }) {
  const [teamA, teamB] = round.teams;
  const totals = calculateRoundTotals(round.matches);
  const pointsAvailable = round.matches.reduce(
    (sum, m) => sum + m.segments.reduce((s, seg) => s + seg.pointsAvailable, 0),
    0,
  );
  const pointsPlayed = totals.teamA + totals.teamB;

  const matchedPairingIds = new Set<string>();
  for (const m of round.matches) {
    if (m.pairingAId) matchedPairingIds.add(m.pairingAId);
    if (m.pairingBId) matchedPairingIds.add(m.pairingBId);
  }
  const unmatchedPairings = round.pairings.filter((p) => !matchedPairingIds.has(p.id));

  if (!teamA && !teamB) {
    return (
      <EmptyState
        icon={Users2}
        title={`${round.name} hasn't started yet`}
        body="Teams and matchups will appear here once the draft is complete."
      />
    );
  }

  return (
    <div className="space-y-8">
      {round.matches.length > 0 && teamA && teamB && (
        <RoundScoreBanner
          teamAName={teamA.name}
          teamBName={teamB.name}
          teamATotal={totals.teamA}
          teamBTotal={totals.teamB}
          pointsPlayed={pointsPlayed}
          pointsAvailable={pointsAvailable}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {teamA && <TeamRoster team={teamA} />}
        {teamB && <TeamRoster team={teamB} />}
      </div>

      {unmatchedPairings.length > 0 && (
        <div className="rounded-2xl border border-dashed border-gold-500/40 bg-gold-50/40 p-5">
          <p className="flex items-center gap-2 font-semibold text-gold-800">
            <Handshake className="h-4 w-4" />
            Pairings Awaiting an Opponent
          </p>
          <p className="mt-1 text-sm text-ink-700/60">
            These locked pairs haven&apos;t been matched up yet — captains are still alternating through the
            matchmaking process.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {unmatchedPairings.map((p) => (
              <span key={p.id} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-ink-900 shadow-sm">
                {p.player1.name} + {p.player2.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {round.matches.length > 0 ? (
        <div>
          <h3 className="font-display text-2xl font-bold text-fairway-900">Matches</h3>
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {round.matches.map((match) => (
              <MatchDetailCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={Users2} title="No matches yet" body="Matchups will appear here once pairings are set." />
      )}
    </div>
  );
}
