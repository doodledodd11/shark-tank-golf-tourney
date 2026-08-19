"use client";

import { useState, useTransition } from "react";
import { Handshake, RotateCcw } from "lucide-react";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { resetTwosomeLock } from "@/lib/actions/matchmaking";

export function LiveTwosomeLockAdminPanel({
  roundId,
  roundName,
  teams,
}: {
  roundId: string;
  roundName: string;
  teams: { id: string; name: string; captainName: string | null; captainAccessToken: string | null; locked: number; required: number }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    setError(null);
    if (confirm(`Reset ${roundName}'s twosomes? Both teams will need to lock them in again. This can't be undone.`)) {
      startTransition(async () => {
        const result = await resetTwosomeLock(roundId);
        if (result.error) setError(result.error);
      });
    }
  }

  return (
    <div className="rounded-2xl border border-gold-400/50 bg-gold-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold text-fairway-900">
          <Handshake className="h-4 w-4" />
          Captains Are Locking Twosomes
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Twosomes
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <p className="mt-1 text-sm text-ink-700/60">
        Each captain builds their own twosomes privately, without seeing the other team&apos;s. Share their link
        below.
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
                  {team.captainName ? `, ${team.captainName}` : ""}
                  <span className="ml-2 text-xs font-normal text-ink-700/50">
                    {team.locked} of {team.required} locked
                  </span>
                </p>
                <p className="truncate text-xs text-ink-700/50">/twosomes/{roundId}/{team.captainAccessToken}</p>
              </div>
              <CopyLinkButton path={`/twosomes/${roundId}/${team.captainAccessToken}`} />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
