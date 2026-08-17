"use client";

import { useRef, useState } from "react";
import type { Course } from "@prisma/client";
import { FlaskConical, PartyPopper, Shuffle } from "lucide-react";
import { pickRandomCourse } from "@/lib/tournament-logic";
import { cn } from "@/lib/utils";

/** A self-contained, client-only sandbox for the random-draw mechanic used
 * by CourseSelectionTool — no server action, no database write, nothing
 * here is ever tied to a real match. It exists purely so a visitor can see
 * how the draw works before any real match needs one. */
export function CourseSelectionDemo({ courses }: { courses: Course[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revealing, setRevealing] = useState(false);
  const [cycleLabel, setCycleLabel] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (courses.length === 0) return null;

  function toggle(id: string) {
    setResult(null);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function selectAll() {
    setResult(null);
    setSelectedIds(courses.map((c) => c.id));
  }

  function clearAll() {
    setResult(null);
    setSelectedIds([]);
  }

  function handleRun() {
    if (selectedIds.length === 0 || revealing) return;
    setResult(null);
    setRevealing(true);

    intervalRef.current = setInterval(() => {
      const randomId = selectedIds[Math.floor(Math.random() * selectedIds.length)];
      setCycleLabel(courses.find((c) => c.id === randomId)?.name ?? null);
    }, 90);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const winnerId = pickRandomCourse(selectedIds.map((id) => ({ courseId: id })));
      setCycleLabel(null);
      setResult(courses.find((c) => c.id === winnerId)?.name ?? null);
      setRevealing(false);
    }, 1400);
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-gold-500/60 bg-gold-50/40 p-5 sm:p-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-fairway-950">
        <FlaskConical className="h-3.5 w-3.5" />
        Example Only, Not a Real Match
      </span>
      <p className="mt-3 text-sm text-ink-700/70">
        This box is just here to show how the random draw works. Check off a few courses like you&apos;re
        standing in for four players, then run the draw. Nothing here is saved or affects any real match.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {courses.map((c) => {
          const active = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-fairway-700 bg-fairway-700 text-cream-50"
                  : "border-fairway-900/15 bg-white text-ink-700 hover:border-fairway-400",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
        <button type="button" onClick={selectAll} className="text-fairway-700 hover:text-fairway-900">
          Select All
        </button>
        <button type="button" onClick={clearAll} className="text-ink-700/50 hover:text-ink-700">
          Clear
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3 border-t border-gold-500/25 pt-5">
        <button
          type="button"
          onClick={handleRun}
          disabled={selectedIds.length === 0 || revealing}
          className="flex items-center gap-2 rounded-full bg-fairway-900 px-6 py-3 font-bold text-cream-50 shadow transition-transform hover:scale-105 hover:bg-fairway-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <Shuffle className={revealing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {revealing ? "Drawing…" : "Run Example Draw"}
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
