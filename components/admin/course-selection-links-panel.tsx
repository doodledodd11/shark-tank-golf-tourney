"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { ensurePlayerAccessTokens, sendCourseSelectionEmails } from "@/lib/actions/course-selection";

export function CourseSelectionLinksPanel({
  matchId,
  participants,
}: {
  matchId: string;
  participants: { playerId: string; playerName: string; accessToken: string | null; hasEmail: boolean }[];
}) {
  const [pending, startTransition] = useTransition();
  const [sendResult, setSendResult] = useState<{ sent: string[]; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGetLinks() {
    setError(null);
    startTransition(async () => {
      const result = await ensurePlayerAccessTokens(matchId);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Tokens are freshly issued server-side; this panel doesn't track its
      // own copy of that data, so a full reload is the simplest way to
      // pick up the new tokens.
      window.location.reload();
    });
  }

  function handleSendEmails() {
    setError(null);
    setSendResult(null);
    startTransition(async () => {
      const result = await sendCourseSelectionEmails(matchId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSendResult({ sent: result.sent ?? [], skipped: result.skipped ?? [] });
      window.location.reload();
    });
  }

  const anyTokensMissing = participants.some((p) => !p.accessToken);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-ink-950">
        <Mail className="h-4 w-4" />
        Player Course-Selection Links
      </p>
      <p className="mt-1 text-xs text-ink-700/50">
        Each player picks their own course through a personal link — the public course page no longer lets anyone
        select on their behalf.
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
          {pending ? "Working…" : "Send Course Selection Emails"}
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
        {participants.map((p) => (
          <div key={p.playerId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-950">
                {p.playerName}
                {!p.hasEmail && <span className="ml-2 text-xs font-normal text-amber-700">no email on file</span>}
              </p>
              {p.accessToken ? (
                <p className="truncate text-xs text-ink-700/50">/courses/{matchId}/{p.accessToken}</p>
              ) : (
                <p className="text-xs text-ink-700/40">No link issued yet</p>
              )}
            </div>
            {p.accessToken && <CopyLinkButton path={`/courses/${matchId}/${p.accessToken}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}
