"use client";

import { useState, useTransition } from "react";
import { ClipboardList } from "lucide-react";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { ensureSideAccessTokens, sendScorecardEmails } from "@/lib/actions/scorecard";

export function ScorecardLinksPanel({
  matchId,
  sides,
}: {
  matchId: string;
  sides: { side: "A" | "B"; names: string; accessToken: string | null; hasEmail: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const [sendResult, setSendResult] = useState<{ sent: string[]; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGetLinks() {
    setError(null);
    startTransition(async () => {
      const result = await ensureSideAccessTokens(matchId);
      if (result.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleSendEmails() {
    setError(null);
    setSendResult(null);
    startTransition(async () => {
      const result = await sendScorecardEmails(matchId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSendResult({ sent: result.sent ?? [], skipped: result.skipped ?? [] });
      window.location.reload();
    });
  }

  const anyTokensMissing = sides.some((s) => !s.accessToken);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-ink-950">
        <ClipboardList className="h-4 w-4" />
        Scorecard Entry Links
      </p>
      <p className="mt-1 text-xs text-ink-700/50">
        One shared link per side — either teammate can use it to enter their team&apos;s hole-by-hole scores during
        or after the round.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {anyTokensMissing && (
          <button
            type="button"
            disabled={pending}
            onClick={handleGetLinks}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-stone-50 disabled:opacity-60"
          >
            Get Links
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleSendEmails}
          className="rounded-lg bg-fairway-800 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-60"
        >
          {pending ? "Working…" : "Send Scorecard Emails"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      {sendResult && (
        <div className="mt-2 text-xs">
          {sendResult.sent.length > 0 && <p className="text-fairway-700">Sent to: {sendResult.sent.join(", ")}</p>}
          {sendResult.skipped.length > 0 && <p className="text-amber-700">Skipped: {sendResult.skipped.join(", ")}</p>}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {sides.map((s) => (
          <div key={s.side} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-950">
                {s.names}
                {!s.hasEmail && <span className="ml-2 text-xs font-normal text-amber-700">no email on file</span>}
              </p>
              {s.accessToken ? (
                <p className="truncate text-xs text-ink-700/50">/scorecard/{matchId}/{s.accessToken}</p>
              ) : (
                <p className="text-xs text-ink-700/40">No link issued yet</p>
              )}
            </div>
            {s.accessToken && <CopyLinkButton path={`/scorecard/${matchId}/${s.accessToken}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}
