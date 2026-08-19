import { ShieldAlert } from "lucide-react";
import { getTwosomeLockBoardData } from "@/lib/matchmaking";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TwosomeLockBoard } from "@/components/twosomes/twosome-lock-board";

export const metadata = { title: "Build Your Twosomes" };

export default async function TwosomeLockCaptainPage({ params }: { params: Promise<{ roundId: string; token: string }> }) {
  const { roundId, token } = await params;
  const data = await getTwosomeLockBoardData(roundId, token);

  return (
    <div>
      <PageHeader
        title={data ? `Build ${data.myTeamName}'s Twosomes` : "Build Your Twosomes"}
        subtitle="Split your roster into 2-man twosomes privately — the other captain can't see your groupings until you're both done."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data ? (
          <TwosomeLockBoard roundId={roundId} captainToken={token} initialData={data} />
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
