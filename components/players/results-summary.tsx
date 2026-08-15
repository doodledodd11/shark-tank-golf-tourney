import type { Player } from "@prisma/client";
import { Trophy } from "lucide-react";
import type { RoundWithDetails } from "@/lib/data";
import { calculateRoundResult } from "@/lib/tournament-logic";
import { formatPoints } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";

export function ResultsSummary({ rounds, champions }: { rounds: RoundWithDetails[]; champions: Player[] }) {
  const roundsWithMatches = rounds.filter((r) => r.matches.length > 0);

  if (roundsWithMatches.length === 0 && champions.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No results yet"
        body="Round-by-round results will appear here once Round 1 matches begin."
      />
    );
  }

  return (
    <div className="space-y-6">
      {champions.length > 0 && (
        <div className="rounded-2xl border border-gold-400 bg-gradient-to-br from-gold-50 to-white p-6 text-center shadow-md">
          <Trophy className="mx-auto h-8 w-8 text-gold-600" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">Tournament Champions</p>
          <p className="mt-1 font-display text-2xl font-bold text-fairway-900">
            {champions.map((c) => c.name).join(" · ")}
          </p>
        </div>
      )}

      {roundsWithMatches.map((round) => {
        const [teamA, teamB] = round.teams;
        const result = calculateRoundResult({
          matches: round.matches.map((m) => ({ segments: m.segments, isPlayoff: m.isPlayoff })),
        });
        const advancingTeam = result.advancing === "A" ? teamA : result.advancing === "B" ? teamB : null;
        return (
          <div key={round.id} className="rounded-2xl border border-fairway-900/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-fairway-900">{round.name}</h3>
              <span className="rounded-full bg-fairway-50 px-3 py-1 text-xs font-semibold text-fairway-700">
                {round.status === "COMPLETE" ? "Final" : "In Progress"}
              </span>
            </div>
            {teamA && teamB && (
              <p className="mt-2 font-display text-2xl font-bold text-ink-950">
                {teamA.name} {formatPoints(result.teamA)} — {formatPoints(result.teamB)} {teamB.name}
              </p>
            )}
            {round.status === "COMPLETE" ? (
              <>
                {result.needsPlayoff && !advancingTeam && (
                  <p className="mt-1 text-sm font-semibold text-gold-700">Tied — captain playoff required</p>
                )}
                {advancingTeam && (
                  <p className="mt-1 text-sm text-ink-700/60">
                    <span className="font-semibold text-fairway-700">{advancingTeam.name}</span> advances
                    {result.needsPlayoff ? " (won captain playoff)" : ""}
                  </p>
                )}
              </>
            ) : (
              teamA &&
              teamB && (
                <p className="mt-1 text-sm text-ink-700/50">
                  {result.leader === "TIE" || !result.leader
                    ? "Currently tied"
                    : `${result.leader === "A" ? teamA.name : teamB.name} currently leads`}{" "}
                  — round still in progress
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
