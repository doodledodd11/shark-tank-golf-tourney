import { CalendarClock } from "lucide-react";
import { getActiveTournament } from "@/lib/data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { JoinTournamentForm } from "@/components/join/join-tournament-form";

export const metadata = { title: "Join the Tournament" };

export default async function JoinPage() {
  const tournament = await getActiveTournament();
  const registrationOpen = tournament.status === "REGISTRATION" && Boolean(tournament.id);

  return (
    <div>
      <PageHeader
        title="Join the Tournament"
        subtitle="Add yourself to the field. No account needed. The admin finalizes tiers and runs the draft once registration closes."
      />

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {registrationOpen ? (
          <JoinTournamentForm />
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="Registration is closed"
            body="The field for this tournament is already set. Check the Players page to see who's in, or reach out to the admin if you think this is a mistake."
          />
        )}
      </div>
    </div>
  );
}
