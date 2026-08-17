"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import type { RoundWithDetails } from "@/lib/data";
import { activateRound, completeRound } from "@/lib/actions/rounds";
import { calculateRoundResult } from "@/lib/tournament-logic";
import { formatPoints } from "@/lib/format";

export function RoundCompletePanel({ round }: { round: RoundWithDetails }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [teamA, teamB] = round.teams;

  if (round.status === "COMPLETE") {
    return (
      <div className="rounded-2xl border border-fairway-300 bg-fairway-50 p-5 text-sm text-fairway-800">
        This round is complete. Eliminations (or championship results) have been recorded.
      </div>
    );
  }

  if (!teamA || !teamB) return null;

  const hasMatches = round.matches.length > 0;
  const result = calculateRoundResult({
    matches: round.matches.map((m) => ({ segments: m.segments, isPlayoff: m.isPlayoff })),
  });
  const advancingTeam = result.advancing === "A" ? teamA : result.advancing === "B" ? teamB : null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 font-semibold text-ink-950">
        <Trophy className="h-4 w-4 text-gold-600" />
        Round Status
      </p>

      {round.status === "PENDING" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => activateRound(round.id))}
          className="mt-3 rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-fairway-700"
        >
          Activate Round
        </button>
      )}

      {hasMatches && (
        <p className="mt-3 text-sm text-ink-700/70">
          Current score: {teamA.name} {formatPoints(result.teamA)}, {teamB.name} {formatPoints(result.teamB)}
        </p>
      )}

      {hasMatches && result.needsPlayoff && !advancingTeam && (
        <p className="mt-1 text-sm font-semibold text-amber-700">
          Tied. Create a Captain Playoff match below and record its result before completing the round.
        </p>
      )}

      {!hasMatches ? (
        <p className="mt-2 text-sm text-ink-700/50">No matches recorded yet.</p>
      ) : advancingTeam ? (
        <div className="mt-4">
          <p className="text-sm text-ink-700/70">
            <span className="font-semibold text-fairway-700">{advancingTeam.name}</span>{" "}
            {round.number === 3 ? "will be crowned champions" : "will advance; the other team will be eliminated"}.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              if (confirm(`Complete ${round.name}? This will ${round.number === 3 ? "crown the champions" : "eliminate the losing team"} and cannot be easily undone.`)) {
                startTransition(async () => {
                  const result = await completeRound(round.id);
                  if (result.error) setError(result.error);
                });
              }
            }}
            className="mt-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-fairway-950 hover:bg-gold-400 disabled:opacity-60"
          >
            {pending ? "Completing…" : round.number === 3 ? "Crown Champions" : "Complete Round & Advance"}
          </button>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        </div>
      ) : null}
    </div>
  );
}
