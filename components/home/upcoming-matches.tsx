import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { MatchWithDetails } from "@/lib/data";
import { calculateMatchTotals } from "@/lib/tournament-logic";
import { formatPoints, formatShortDate } from "@/lib/format";
import { MatchStatusBadge } from "@/components/shared/match-status-badge";
import { getSideNames as sideNames } from "@/lib/match-helpers";

export function UpcomingMatches({ matches, roundNameById }: { matches: MatchWithDetails[]; roundNameById: Map<string, string> }) {
  if (matches.length === 0) return null;

  return (
    <section className="bg-cream-50 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fairway-600">On the Course</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-fairway-900 sm:text-4xl">
              Upcoming &amp; Recent Matches
            </h2>
          </div>
          <Link href="/matches" className="hidden shrink-0 text-sm font-semibold text-fairway-700 hover:text-fairway-900 sm:block">
            View all matches →
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {matches.map((match) => {
            const totals = calculateMatchTotals(match.segments);
            const isComplete = match.status === "COMPLETE";
            return (
              <div key={match.id} className="rounded-2xl border border-fairway-900/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                    {roundNameById.get(match.roundId) ?? "Round"} · Match {match.matchNumber}
                  </p>
                  <MatchStatusBadge status={match.status} />
                </div>

                <div className="mt-3 space-y-1.5">
                  <p className="font-semibold text-ink-950">
                    <span className="text-fairway-700">{match.teamA?.name ?? "Team A"}:</span> {sideNames(match, "A")}
                  </p>
                  <p className="font-semibold text-ink-950">
                    <span className="text-fairway-700">{match.teamB?.name ?? "Team B"}:</span> {sideNames(match, "B")}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700/60">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {match.course?.name ?? "Course TBD"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatShortDate(match.scheduledDate)}
                  </span>
                </div>

                {isComplete && (
                  <p className="mt-4 rounded-lg bg-fairway-50 px-3 py-2 text-center font-display text-lg font-bold text-fairway-900">
                    {match.teamA?.name ?? "A"} {formatPoints(totals.teamA)}, {match.teamB?.name ?? "B"}{" "}
                    {formatPoints(totals.teamB)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/matches" className="text-sm font-semibold text-fairway-700 hover:text-fairway-900">
            View all matches →
          </Link>
        </div>
      </div>
    </section>
  );
}
