import { Radio } from "lucide-react";
import { getMatchmakingBoardData } from "@/lib/matchmaking";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchmakingBoard } from "@/components/matchmaking/matchmaking-board";

export const metadata = { title: "Live Matchmaking" };

export default async function MatchmakingSpectatorPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const data = await getMatchmakingBoardData(roundId);

  return (
    <div>
      <PageHeader
        title="Live Matchmaking"
        subtitle="Captains alternate announcing a twosome and picking an opponent for it, until every twosome has a match."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data ? (
          <MatchmakingBoard roundId={roundId} captainToken={null} initialData={data} />
        ) : (
          <EmptyState icon={Radio} title="No live matchmaking here" body="This round isn't in the matchmaking phase right now." />
        )}
      </div>
    </div>
  );
}
