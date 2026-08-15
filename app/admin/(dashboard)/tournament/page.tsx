import { getActiveTournament } from "@/lib/data";
import { TournamentForm } from "@/components/admin/tournament-form";

export const metadata = { title: "Tournament Settings" };

export default async function AdminTournamentPage() {
  const tournament = await getActiveTournament();

  if (!tournament.id) {
    return <p className="text-ink-700/60">No tournament found. Run the database seed script first.</p>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-ink-950">Tournament Settings</h1>
      <p className="mt-1 text-sm text-ink-700/60">
        These values drive the homepage hero, status banner, progression tracker, and prize pool display.
      </p>
      <div className="mt-6">
        <TournamentForm tournament={tournament} />
      </div>
    </div>
  );
}
