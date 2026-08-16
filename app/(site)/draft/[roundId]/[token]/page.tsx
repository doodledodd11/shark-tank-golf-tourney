import { ShieldAlert } from "lucide-react";
import { getDraftBoardData } from "@/lib/draft";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DraftBoard } from "@/components/draft/draft-board";

export const metadata = { title: "Live Draft — Captain" };

export default async function DraftCaptainPage({ params }: { params: Promise<{ roundId: string; token: string }> }) {
  const { roundId, token } = await params;
  const data = await getDraftBoardData(roundId, token);
  const isValidCaptain = Boolean(data?.myTeamId);

  return (
    <div>
      <PageHeader
        title={isValidCaptain ? `You're Drafting for ${data!.teams.find((t) => t.id === data!.myTeamId)!.name}` : "Live Draft"}
        subtitle="Pick your roster one tier at a time — everyone else can follow along on the public draft page."
      />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data && isValidCaptain ? (
          <DraftBoard roundId={roundId} captainToken={token} initialData={data} />
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
