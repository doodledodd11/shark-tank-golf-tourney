import { Radio } from "lucide-react";
import { getDraftBoardData } from "@/lib/draft";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DraftBoard } from "@/components/draft/draft-board";

export const metadata = { title: "Live Draft" };

export default async function DraftSpectatorPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const data = await getDraftBoardData(roundId);

  return (
    <div>
      <PageHeader title="Live Draft" subtitle="Follow along as each team's captain builds their roster, tier by tier." />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {data ? (
          <DraftBoard roundId={roundId} captainToken={null} initialData={data} />
        ) : (
          <EmptyState icon={Radio} title="No live draft here" body="This round doesn't have a live draft running right now." />
        )}
      </div>
    </div>
  );
}
