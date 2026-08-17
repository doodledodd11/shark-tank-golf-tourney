import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import type { MatchWithDetails } from "@/lib/data";
import { calculateMatchTotals, computeSegmentPoints } from "@/lib/tournament-logic";
import { formatPoints, formatDate } from "@/lib/format";
import { FORMAT_INFO } from "@/lib/formats";
import { getSideNames } from "@/lib/match-helpers";
import { MatchStatusBadge } from "@/components/shared/match-status-badge";
import { cn } from "@/lib/utils";

export function MatchDetailCard({ match, roundLabel }: { match: MatchWithDetails; roundLabel?: string }) {
  const totals = calculateMatchTotals(match.segments);
  const isComplete = match.status === "COMPLETE";
  const liveUrl = match.gameBookLeaderboardUrl || match.gameBookEventUrl || match.externalScoringUrl;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm sm:p-6",
        match.isPlayoff ? "border-gold-400 ring-1 ring-gold-400/30" : "border-fairway-900/10",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">
          {roundLabel && `${roundLabel} · `}
          {match.isPlayoff ? "Captain Playoff" : `Match ${match.matchNumber}`}
        </p>
        <MatchStatusBadge status={match.status} />
      </div>

      <div className="mt-3 grid grid-cols-1 items-center gap-2 text-center sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <p className="text-xs font-semibold text-fairway-700">{match.teamA?.name ?? "Team A"}</p>
          <p className="font-display text-lg font-bold text-ink-950">{getSideNames(match, "A")}</p>
        </div>
        <p className="text-xs font-semibold uppercase text-ink-700/30">vs</p>
        <div>
          <p className="text-xs font-semibold text-fairway-700">{match.teamB?.name ?? "Team B"}</p>
          <p className="font-display text-lg font-bold text-ink-950">{getSideNames(match, "B")}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-ink-700/60">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {match.course?.name ?? "Course TBD"}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(match.scheduledDate)}
        </span>
      </div>

      {liveUrl && (
        <div className="mt-4 flex justify-center">
          <Link
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-fairway-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cream-50 transition-colors hover:bg-fairway-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Follow Match Live
          </Link>
        </div>
      )}

      {match.segments.length > 0 && (
        <div className="mt-5 overflow-x-auto border-t border-fairway-900/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">
                <th scope="col" className="py-2 text-left font-semibold">
                  <span className="sr-only">Segment</span>
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Team A
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Team B
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fairway-900/5">
              {match.segments.map((segment) => {
                const points = computeSegmentPoints(segment);
                const decided = segment.winner !== null;
                const label =
                  segment.format === "OVERALL"
                    ? segment.name
                    : `${segment.name}, ${FORMAT_INFO[segment.format as keyof typeof FORMAT_INFO]?.label ?? segment.format}`;
                return (
                  <tr key={segment.id}>
                    <td className="py-2.5 text-ink-700/70">{label}</td>
                    {decided ? (
                      <>
                        <td className="py-2.5 text-right font-semibold text-ink-950">{formatPoints(points.teamA)}</td>
                        <td className="py-2.5 text-right font-semibold text-ink-950">{formatPoints(points.teamB)}</td>
                      </>
                    ) : (
                      <td colSpan={2} className="py-2.5 text-right text-ink-700/35">
                        Not yet played
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-fairway-50 px-4 py-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-fairway-600">
          {isComplete ? "Match Total" : "Match Total (so far)"}
        </p>
        <p className="mt-0.5 font-display text-2xl font-bold text-fairway-900">
          {match.teamA?.name ?? "Team A"} {formatPoints(totals.teamA)}, {match.teamB?.name ?? "Team B"}{" "}
          {formatPoints(totals.teamB)}
        </p>
      </div>
    </div>
  );
}
