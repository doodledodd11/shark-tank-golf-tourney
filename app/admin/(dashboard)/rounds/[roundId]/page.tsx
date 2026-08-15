import { notFound } from "next/navigation";
import { getActiveTournament, getAllPlayers, getRoundWithDetails } from "@/lib/data";
import { getEligiblePlayersForRound } from "@/lib/player-status";
import { RoundRosterTool } from "@/components/admin/round-roster-tool";
import { RoundPairingsManager } from "@/components/admin/round-pairings-manager";
import { RoundMatchCreator } from "@/components/admin/round-match-creator";
import { RoundMatchList } from "@/components/admin/round-match-list";
import { RoundCompletePanel } from "@/components/admin/round-complete-panel";
import { RoundDeadlineField } from "@/components/admin/round-deadline-field";

export const metadata = { title: "Round Management" };

export default async function AdminRoundPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const round = await getRoundWithDetails(roundId);
  if (!round) notFound();

  const tournament = await getActiveTournament();
  const allPlayers = await getAllPlayers(tournament.id);
  const eligiblePlayers = getEligiblePlayersForRound(round, allPlayers);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{round.name}</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            {round.playersStart} players → {round.playersAdvance} advance · Status: {round.status}
          </p>
        </div>
        <RoundDeadlineField roundId={round.id} deadline={round.deadline} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">1. Draft Teams</h2>
        <RoundRosterTool roundId={round.id} teams={round.teams} eligiblePlayers={eligiblePlayers} />
      </section>

      {round.teams.length > 0 && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">2. Pairings</h2>
            <RoundPairingsManager round={round} teams={round.teams} />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">3. Matchups</h2>
            <RoundMatchCreator round={round} teams={round.teams} />
            <div className="mt-4">
              <RoundMatchList matches={round.matches} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">4. Finish Round</h2>
            <RoundCompletePanel round={round} />
          </section>
        </>
      )}
    </div>
  );
}
