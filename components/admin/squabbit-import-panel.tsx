"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ChevronDown, Upload } from "lucide-react";
import { previewSquabbitMatchImport, applySquabbitMatchImport } from "@/lib/actions/squabbit";
import type { MatchImportResult } from "@/lib/squabbit";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
};

export function SquabbitImportPanel({ matchId }: { matchId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<MatchImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handlePreview() {
    setError(null);
    setResult(null);
    setApplied(false);
    startTransition(async () => {
      const res = await previewSquabbitMatchImport(matchId, csvText);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(res.result!);
    });
  }

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const res = await applySquabbitMatchImport(matchId, csvText);
      if (res.error) {
        setError(res.error);
        return;
      }
      setApplied(true);
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <p className="flex items-center gap-2 font-semibold text-ink-950">
          <Upload className="h-4 w-4" />
          Import from Squabbit
        </p>
        <ChevronDown className={cn("h-4 w-4 text-ink-700/40 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-stone-100 p-4 pt-3">
          <p className="text-xs text-ink-700/50">
            Paste the round&apos;s exported CSV from Squabbit. This fills in the Front 9, Back 9, and Overall 18
            segments from that round&apos;s Out/In/Total, and the match&apos;s course and date if they&apos;re
            parseable — review the preview before applying.
          </p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={6}
            placeholder="Paste CSV contents here…"
            className="mt-2 w-full rounded-lg border border-stone-300 p-2 font-mono text-xs shadow-sm focus:border-fairway-500 focus:outline-none"
          />

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending || csvText.trim() === ""}
              onClick={handlePreview}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {pending && !result ? "Reading…" : "Preview"}
            </button>
            {result && (
              <button
                type="button"
                disabled={pending || applied}
                onClick={handleApply}
                className="rounded-lg bg-fairway-800 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-50"
              >
                {applied ? "Applied ✓" : pending ? "Applying…" : "Apply to this match"}
              </button>
            )}
          </div>

          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

          {result && (
            <div className="mt-3 space-y-2 rounded-lg bg-stone-50 p-3 text-xs">
              <p className="font-semibold text-ink-800">
                {result.courseName ?? "Course not detected"}
                {result.dateText ? `, ${result.dateText}` : ""}
              </p>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-ink-700/50">
                    <th className="pr-2 font-semibold">Segment</th>
                    <th className="pr-2 font-semibold">Team A</th>
                    <th className="pr-2 font-semibold">Team B</th>
                    <th className="pr-2 font-semibold">Winner</th>
                    <th className="font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.segments.map((s) => (
                    <tr key={s.segmentName} className="border-t border-stone-200">
                      <td className="py-1 pr-2 font-medium text-ink-900">{s.segmentName}</td>
                      <td className="pr-2">{s.teamAScore ?? "—"}</td>
                      <td className="pr-2">{s.teamBScore ?? "—"}</td>
                      <td className="pr-2">{s.winner ?? "—"}</td>
                      <td>{STATUS_LABELS[s.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-ink-700/60">
                Match will be marked <span className="font-semibold">{STATUS_LABELS[result.matchStatus]}</span>.
              </p>

              {(result.unmatchedCsvPlayers.length > 0 || result.missingParticipants.length > 0) && (
                <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    {result.unmatchedCsvPlayers.length > 0 && (
                      <p>CSV names that didn&apos;t match this match&apos;s players: {result.unmatchedCsvPlayers.join(", ")}</p>
                    )}
                    {result.missingParticipants.length > 0 && (
                      <p>This match&apos;s players missing from the CSV: {result.missingParticipants.join(", ")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
