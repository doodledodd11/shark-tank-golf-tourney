import { ShieldAlert } from "lucide-react";
import { getPlayerCourseSelectionData } from "@/lib/course-selection";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PlayerCourseSelectionForm } from "@/components/courses/player-course-selection-form";

export const metadata = { title: "Your Course Selection" };

export default async function PlayerCourseSelectionPage({ params }: { params: Promise<{ matchId: string; token: string }> }) {
  const { matchId, token } = await params;
  const data = await getPlayerCourseSelectionData(matchId, token);

  return (
    <div>
      <PageHeader title="Your Course Selection" subtitle={data ? data.matchLabel : "Pick your preferred course for your match."} />
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        {data ? (
          <PlayerCourseSelectionForm token={token} data={data} />
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
