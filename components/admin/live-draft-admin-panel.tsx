import Link from "next/link";
import { ExternalLink, Shuffle } from "lucide-react";
import type { TeamWithRoster } from "@/lib/data";
import { CopyLinkButton } from "@/components/admin/copy-link-button";

export function LiveDraftAdminPanel({
  roundId,
  teams,
  statusLabel,
}: {
  roundId: string;
  teams: TeamWithRoster[];
  statusLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-gold-400/50 bg-gold-50/40 p-5">
      <p className="flex items-center gap-2 font-semibold text-fairway-900">
        <Shuffle className="h-4 w-4" />
        Live Draft in Progress, {statusLabel}
      </p>
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
