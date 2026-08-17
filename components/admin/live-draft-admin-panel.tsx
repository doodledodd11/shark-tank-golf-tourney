"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Shuffle } from "lucide-react";
import type { TeamWithRoster } from "@/lib/data";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { cancelDraft } from "@/lib/actions/draft";

export function LiveDraftAdminPanel({
  roundId,
  roundName,
  teams,
  statusLabel,
}: {
  roundId: string;
  roundName: string;
  teams: TeamWithRoster[];
  statusLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setError(null);
    if (
      confirm(
        `Cancel the live draft for ${roundName}? Both teams' rosters will be wiped and every captain's link will stop working. This can't be undone, but you can start a fresh draft right after.`,
      )
    ) {
      startTransition(async () => {
        const result = await cancelDraft(roundId);
        if (result.error) setError(result.error);
      });
    }
  }

  return (
    <div className="rounded-2xl border border-gold-400/50 bg-gold-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-fairway-900">
          <Shuffle className="h-4 w-4" />
          Live Draft in Progress, {statusLabel}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleCancel}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pending ? "Canceling…" : "Cancel Draft"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <p className="mt-1 text-sm text-ink-700/60">
        Share each captain&apos;s link below. They pick on their own, live, no account needed. The manual roster
        tool is hidden here while this is running; it&apos;ll reappear once the draft is complete if something
        needs fixing.
      </p>
      <div className="mt-4 space-y-2">
        {teams.map((team) =>
          team.captainAccessToken ? (
            <div
              key={team.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-950">
                  {team.name}
                  {team.captain ? `, ${team.captain.name}` : ""}
                </p>
                <p className="truncate text-xs text-ink-700/50">/draft/{roundId}/{team.captainAccessToken}</p>
              </div>
              <CopyLinkButton path={`/draft/${roundId}/${team.captainAccessToken}`} />
            </div>
          ) : null,
        )}
      </div>
      <Link
        href={`/draft/${roundId}`}
        target="_blank"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-fairway-700 hover:text-fairway-900"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open the spectator view
      </Link>
    </div>
  );
}
