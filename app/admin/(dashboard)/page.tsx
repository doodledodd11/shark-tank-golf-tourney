import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";
import { getActiveTournament } from "@/lib/data";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";

export default async function AdminDashboardPage() {
  const tournament = await getActiveTournament();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink-950">{tournament.name}</h1>
      <p className="mt-1 text-stone-600">
        {tournament.season} season · Status:{" "}
        <span className="font-medium text-fairway-700">
          {TOURNAMENT_STATUS_LABELS[tournament.status as TournamentStatus]}
        </span>
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_NAV_LINKS.filter((l) => l.href !== "/admin").map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="font-medium text-ink-900">{link.label}</span>
            <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-fairway-700" />
          </Link>
        ))}
      </div>
    </div>
  );
}
