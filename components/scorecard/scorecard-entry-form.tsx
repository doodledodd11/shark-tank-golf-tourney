"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitHoleScores } from "@/lib/actions/scorecard";
import type { ScorecardEntryData } from "@/lib/scorecard";

function sumRange(holes: number[], start: number, end: number): number | null {
  const slice = holes.slice(start, end);
  if (slice.some((h) => h <= 0)) return null;
  return slice.reduce((a, b) => a + b, 0);
}

function NineTable({
  label,
  holeNumbers,
  par,
  holes,
  onChange,
}: {
  label: string;
  holeNumbers: number[];
  par: number[];
  holes: string[];
  onChange: (holeIndex: number, value: string) => void;
}) {
  const start = holeNumbers[0]! - 1;
  const total = sumRange(
    holes.map((h) => Number(h) || 0),
    start,
    start + holeNumbers.length,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-center text-sm">
        <thead>
          <tr className="text-xs text-ink-700/50">
            <th className="p-1 text-left font-medium">{label}</th>
            {holeNumbers.map((n) => (
              <th key={n} className="p-1 font-medium">
                {n}
              </th>
            ))}
            <th className="p-1 font-semibold">{label === "Front 9" ? "Out" : "In"}</th>
          </tr>
        </thead>
        <tbody>
          {par.length === 18 && (
            <tr className="text-xs text-ink-700/40">
              <td className="p-1 text-left">Par</td>
              {holeNumbers.map((n) => (
                <td key={n} className="p-1">
                  {par[n - 1]}
                </td>
              ))}
              <td className="p-1">{par.slice(start, start + holeNumbers.length).reduce((a, b) => a + b, 0)}</td>
            </tr>
          )}
          <tr>
            <td className="p-1 text-left font-medium text-ink-900">Score</td>
            {holeNumbers.map((n) => (
              <td key={n} className="p-1">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={holes[n - 1] || ""}
                  onChange={(e) => onChange(n - 1, e.target.value)}
                  className="h-9 w-9 rounded-lg border border-stone-300 text-center text-sm focus:border-fairway-500 focus:outline-none"
                />
              </td>
            ))}
            <td className="p-1 font-semibold text-ink-900">{total ?? "-"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ScorecardEntryForm({ token, data }: { token: string; data: ScorecardEntryData }) {
  const [holes, setHoles] = useState<string[]>(
    Array.from({ length: 18 }, (_, i) => (data.myHoles[i] && data.myHoles[i]! > 0 ? String(data.myHoles[i]) : "")),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const numericHoles = holes.map((h) => Number(h) || 0);
  const out = sumRange(numericHoles, 0, 9);
  const inn = sumRange(numericHoles, 9, 18);
  const total = out != null && inn != null ? out + inn : null;

  function handleChange(holeIndex: number, value: string) {
    setSaved(false);
    setError(null);
    setHoles((prev) => {
      const next = [...prev];
      next[holeIndex] = value.replace(/[^0-9]/g, "").slice(0, 2);
      return next;
    });
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitHoleScores({ matchId: data.matchId, token, holes: numericHoles });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-fairway-900/10 bg-white p-6 shadow-sm">
      <p className="text-sm text-ink-700/60">
        <span className="font-semibold text-ink-900">{data.myNames}</span> vs {data.opponentNames}
        {data.courseName ? ` · ${data.courseName}` : ""}
      </p>
      <p className="mt-1 text-xs text-ink-700/50">
        Enter your team&apos;s combined score for each hole. Either of you can fill this in, any time — save as often as you like.
      </p>

      <div className="mt-4 space-y-4">
        <NineTable
          label="Front 9"
          holeNumbers={[1, 2, 3, 4, 5, 6, 7, 8, 9]}
          par={data.parByHole}
          holes={holes}
          onChange={handleChange}
        />
        <NineTable
          label="Back 9"
          holeNumbers={[10, 11, 12, 13, 14, 15, 16, 17, 18]}
          par={data.parByHole}
          holes={holes}
          onChange={handleChange}
        />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-stone-50 px-4 py-2 text-sm">
        <span className="text-ink-700/60">Total</span>
        <span className="font-semibold text-ink-900">{total ?? (out != null ? `${out} thru 9` : "-")}</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save Scorecard"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-fairway-700">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
