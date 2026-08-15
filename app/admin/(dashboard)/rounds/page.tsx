import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getActiveTournament, getRoundsWithDetails } from "@/lib/data";
import { calculateRoundTotals } from "@/lib/tournament-logic";
import { formatPoints } from "@/lib/format";

export const metadata = { title: "Rounds & Matches" };

export default async function AdminRoundsPage() {
  const tournament = await getActiveTournament();
  const rounds = await getRoundsWithDetails(tournament.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Rounds &amp; Matches</h1>
      <p className="mt-1 text-sm text-ink-700/60">
        Manage teams, pairings, and matches round by round.
      </p>

      <div className="mt-6 space-y-4">
        {rounds.map((round) => {
          const totals = calculateRoundTotals(round.matches);
          const [teamA, teamB] = round.teams;
          return (
            <Link
              key={round.id}
              href={`/admin/rounds/${round.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl font-bold text-ink-950">{round.name}</p>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                    {round.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-700/60">
                  {round.teams.length === 0
                    ? "No teams drafted yet"
                    : `${round.teams.length} teams · ${round.pairings.length} pairings · ${round.matches.length} matches`}
                  {teamA && teamB && round.matches.length > 0 && (
                    <>
                      {" "}
                      · {teamA.name} {formatPoints(totals.teamA)} — {formatPoints(totals.teamB)} {teamB.name}
                    </>
                  )}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-stone-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
