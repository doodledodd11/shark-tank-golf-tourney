import { Radio } from "lucide-react";
import { getSinglesMatchmakingBoardData } from "@/lib/matchmaking";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SinglesMatchmakingBoard } from "@/components/matchmaking/singles-matchmaking-board";

export const metadata = { title: "Live Singles Matchmaking" };

export default async function SinglesMatchmakingSpectatorPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const data = await getSinglesMatchmakingBoardData(roundId);

  return (
    <div>
      <PageHeader
        title="Live Singles Matchmaking"
        subtitle="Captains alternate announcing a player and picking an opponent for them, until every player has a match."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data ? (
          <SinglesMatchmakingBoard roundId={roundId} captainToken={null} initialData={data} />
        ) : (
          <EmptyState icon={Radio} title="No live singles matchmaking here" body="This round isn't in singles matchmaking right now." />
        )}
      </div>
    </div>
  );
}
