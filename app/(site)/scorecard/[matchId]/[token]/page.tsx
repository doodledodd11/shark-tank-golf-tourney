import { ShieldAlert } from "lucide-react";
import { getScorecardEntry } from "@/lib/actions/scorecard";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ScorecardEntryForm } from "@/components/scorecard/scorecard-entry-form";

export const metadata = { title: "Your Scorecard" };

export default async function ScorecardEntryPage({ params }: { params: Promise<{ matchId: string; token: string }> }) {
  const { matchId, token } = await params;
  const data = await getScorecardEntry(matchId, token);

  return (
    <div>
      <PageHeader title="Your Scorecard" subtitle={data ? data.matchLabel : "Enter your team's hole-by-hole scores."} />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {data ? (
          <ScorecardEntryForm token={token} data={data} />
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="This link isn't valid"
            body="Double-check the link you were sent, or ask the tournament admin to resend it."
          />
        )}
      </div>
    </div>
  );
}
