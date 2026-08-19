import { ShieldAlert } from "lucide-react";
import { getMatchmakingBoardData } from "@/lib/matchmaking";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MatchmakingBoard } from "@/components/matchmaking/matchmaking-board";

export const metadata = { title: "Live Matchmaking, Captain" };

export default async function MatchmakingCaptainPage({ params }: { params: Promise<{ roundId: string; token: string }> }) {
  const { roundId, token } = await params;
  const data = await getMatchmakingBoardData(roundId, token);
  const isValidCaptain = Boolean(data?.myTeamId);

  return (
    <div>
      <PageHeader
        title={isValidCaptain ? `Matchmaking for ${data!.teams.find((t) => t.id === data!.myTeamId)!.name}` : "Live Matchmaking"}
        subtitle="Announce a twosome, or pick one of yours to answer the other captain's announcement. Everyone else can follow along on the public page."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data && isValidCaptain ? (
          <MatchmakingBoard roundId={roundId} captainToken={token} initialData={data} />
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
