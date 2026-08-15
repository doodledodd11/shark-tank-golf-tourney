import { getActiveTournament, getAllPlayers, getRoundsWithDetails } from "@/lib/data";
import { buildAssignmentMap } from "@/lib/player-status";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullFieldGrid } from "@/components/players/full-field-grid";
import { RoundSection } from "@/components/players/round-section";
import { ResultsSummary } from "@/components/players/results-summary";

export const metadata = { title: "Players" };

export default async function PlayersPage() {
  const tournament = await getActiveTournament();
  const [players, rounds] = await Promise.all([
    getAllPlayers(tournament.id),
    getRoundsWithDetails(tournament.id),
  ]);

  const assignments = buildAssignmentMap(rounds, players);
  const round1 = rounds.find((r) => r.number === 1);
  const round2 = rounds.find((r) => r.number === 2);
  const championship = rounds.find((r) => r.number === 3);
  const champions = players.filter((p) => p.status === "CHAMPION");

  return (
    <div>
      <PageHeader
        title="Players & Tournament"
        subtitle={`${players.length} golfers · ${players.filter((p) => p.status === "ACTIVE").length} still competing`}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Tabs defaultValue="full-field">
          <div className="flex justify-center">
            <TabsList>
              <TabsTrigger value="full-field">Full Field</TabsTrigger>
              <TabsTrigger value="round-1">Round 1</TabsTrigger>
              <TabsTrigger value="round-2">Round 2</TabsTrigger>
              <TabsTrigger value="championship">Championship</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="full-field" className="mt-8">
            <FullFieldGrid players={players} assignments={assignments} />
          </TabsContent>

          <TabsContent value="round-1" className="mt-8">
            {round1 ? (
              <RoundSection round={round1} />
            ) : (
              <p className="text-center text-ink-700/60">Round 1 has not been created yet.</p>
            )}
          </TabsContent>

          <TabsContent value="round-2" className="mt-8">
            {round2 ? (
              <RoundSection round={round2} />
            ) : (
              <p className="text-center text-ink-700/60">Round 2 has not been created yet.</p>
            )}
          </TabsContent>

          <TabsContent value="championship" className="mt-8">
            {championship ? (
              <RoundSection round={championship} />
            ) : (
              <p className="text-center text-ink-700/60">The championship has not been created yet.</p>
            )}
          </TabsContent>

          <TabsContent value="results" className="mt-8">
            <ResultsSummary rounds={rounds} champions={champions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
