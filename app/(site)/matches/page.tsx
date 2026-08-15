import { getActiveTournament, getAllPlayers, getRoundsWithDetails } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { MatchesExplorer, type FlatMatch } from "@/components/matches/matches-explorer";

export const metadata = { title: "Matches" };

export default async function MatchesPage() {
  const tournament = await getActiveTournament();
  const [players, rounds] = await Promise.all([
    getAllPlayers(tournament.id),
    getRoundsWithDetails(tournament.id),
  ]);

  const matches: FlatMatch[] = rounds.flatMap((r) =>
    r.matches.map((m) => ({ ...m, roundName: r.name, roundNumber: r.number })),
  );
  matches.sort((a, b) => {
    if (a.roundNumber !== b.roundNumber) return a.roundNumber - b.roundNumber;
    return a.matchNumber - b.matchNumber;
  });

  const roundOptions = rounds.map((r) => ({ value: String(r.number), label: r.name }));
  const teamOptions = rounds.flatMap((r) => r.teams.map((t) => ({ value: t.id, label: `${t.name} (${r.name})` })));
  const playerOptions = players.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div>
      <PageHeader title="Matches" subtitle="Every 2v2 match across the tournament, live and historical." />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <MatchesExplorer
          matches={matches}
          roundOptions={roundOptions}
          teamOptions={teamOptions}
          playerOptions={playerOptions}
        />
      </div>
    </div>
  );
}
