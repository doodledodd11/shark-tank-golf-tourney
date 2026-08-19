import { ShieldAlert } from "lucide-react";
import { getSinglesMatchmakingBoardData } from "@/lib/matchmaking";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SinglesMatchmakingBoard } from "@/components/matchmaking/singles-matchmaking-board";

export const metadata = { title: "Live Singles Matchmaking, Captain" };

export default async function SinglesMatchmakingCaptainPage({ params }: { params: Promise<{ roundId: string; token: string }> }) {
  const { roundId, token } = await params;
  const data = await getSinglesMatchmakingBoardData(roundId, token);
  const isValidCaptain = Boolean(data?.myTeamId);

  return (
    <div>
      <PageHeader
        title={isValidCaptain ? `Singles Matchmaking for ${data!.teams.find((t) => t.id === data!.myTeamId)!.name}` : "Live Singles Matchmaking"}
        subtitle="Announce a player, or pick one of yours to answer the other captain's announcement."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data && isValidCaptain ? (
          <SinglesMatchmakingBoard roundId={roundId} captainToken={token} initialData={data} />
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="This link isn't valid"
            body="Double-check the link your admin sent you, or ask them to resend it from the round's admin page."
          />
        )}
      </div>
    </div>
  );
}
