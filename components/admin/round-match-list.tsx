"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { RoundWithDetails } from "@/lib/data";
import { deleteMatch } from "@/lib/actions/matches";
import { calculateMatchTotals } from "@/lib/tournament-logic";
import { formatPoints } from "@/lib/format";
import { getSideNames } from "@/lib/match-helpers";
import { MatchStatusBadge } from "@/components/shared/match-status-badge";

export function RoundMatchList({ matches }: { matches: RoundWithDetails["matches"] }) {
  if (matches.length === 0) {
    return <p className="text-sm text-ink-700/50">No matches created yet.</p>;
  }

  return (
    <div className="space-y-2">
      {matches.map((match) => (
        <MatchRow key={match.id} match={match} />
      ))}
    </div>
  );
}

function MatchRow({ match }: { match: RoundWithDetails["matches"][number] }) {
  const [pending, startTransition] = useTransition();
  const totals = calculateMatchTotals(match.segments);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">
          {match.isPlayoff ? "Playoff" : `Match ${match.matchNumber}`}
        </p>
        <p className="text-sm font-medium text-ink-950">
          {getSideNames(match, "A")} <span className="text-ink-700/40">vs</span> {getSideNames(match, "B")}
        </p>
        <p className="text-xs text-ink-700/50">
          {formatPoints(totals.teamA)} — {formatPoints(totals.teamB)} · {match.course?.name ?? "No course set"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <MatchStatusBadge status={match.status} />
        <Link
          href={`/admin/matches/${match.id}`}
          className="rounded-lg bg-fairway-800 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-fairway-700"
        >
          Edit
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this match? This cannot be undone.")) {
              startTransition(() => deleteMatch(match.id));
            }
          }}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Delete match"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
