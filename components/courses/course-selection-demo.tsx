"use client";

import { useRef, useState } from "react";
import type { Course } from "@prisma/client";
import { PartyPopper, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pickRandomCourse } from "@/lib/tournament-logic";

const DEMO_PLAYERS = ["Player 1", "Player 2", "Player 3", "Player 4"];

/** A self-contained, client-only sandbox for the random-draw mechanic used
 * by CourseSelectionTool — same layout, but no server action or database
 * write, and never tied to a real match. The dashed border and "Example"
 * badge are the only things that mark it as a stand-in for the real tool. */
export function CourseSelectionDemo({ courses }: { courses: Course[] }) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState(false);
  const [cycleLabel, setCycleLabel] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (courses.length === 0) return null;

  function handleSelect(player: string, courseId: string) {
    setResult(null);
    setSelections((prev) => ({ ...prev, [player]: courseId }));
  }

  const pool = Object.values(selections)
    .map((courseId) => courses.find((c) => c.id === courseId))
    .filter((c): c is Course => Boolean(c));

  function handleRun() {
    if (pool.length === 0 || revealing) return;
    setResult(null);
    setRevealing(true);

    intervalRef.current = setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)];
      setCycleLabel(random?.name ?? null);
    }, 90);

    setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const winnerId = pickRandomCourse(pool.map((c) => ({ courseId: c.id })));
      setCycleLabel(null);
      setResult(courses.find((c) => c.id === winnerId)?.name ?? null);
      setRevealing(false);
    }, 1400);
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-gold-500/60 bg-gold-50/40 p-5 sm:p-6">
      <span className="inline-flex items-center rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-fairway-950">
        Example
      </span>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DEMO_PLAYERS.map((player) => (
          <div key={player}>
            <label className="mb-1 block text-sm font-semibold text-ink-900">{player}&apos;s choice</label>
            <Select value={selections[player] ?? undefined} onValueChange={(v) => handleSelect(player, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {pool.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">
            Random Draw Pool ({pool.length} {pool.length === 1 ? "entry" : "entries"} so far)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pool.map((c, i) => (
              <span key={`${c.id}-${i}`} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-fairway-700">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3 border-t border-gold-500/25 pt-5">
        <button
          type="button"
          onClick={handleRun}
          disabled={pool.length === 0 || revealing}
          className="flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 font-bold text-fairway-950 shadow transition-transform hover:scale-105 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <Shuffle className={revealing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {revealing ? "Testing…" : "Test"}
        </button>

        {cycleLabel && <p className="font-display text-xl font-bold text-ink-400">{cycleLabel}</p>}

        {result && (
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white px-6 py-4 text-center shadow-sm">
            <PartyPopper className="h-6 w-6 text-gold-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Example Result</p>
            <p className="font-display text-2xl font-bold text-fairway-900">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
