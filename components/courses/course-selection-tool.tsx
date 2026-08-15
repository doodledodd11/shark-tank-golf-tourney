"use client";

import { useRef, useState, useTransition } from "react";
import type { Course } from "@prisma/client";
import { PartyPopper, Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { randomizeMatchCourse, submitCourseSelection } from "@/lib/actions/course-selection";

interface ParticipantInfo {
  playerId: string;
  playerName: string;
}

interface SelectionInfo {
  playerId: string;
  courseId: string;
}

export function CourseSelectionTool({
  matchId,
  matchLabel,
  participants,
  courses,
  initialSelections,
}: {
  matchId: string;
  matchLabel: string;
  participants: ParticipantInfo[];
  courses: Course[];
  initialSelections: SelectionInfo[];
}) {
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of initialSelections) map[s.playerId] = s.courseId;
    return map;
  });
  const [pending, startTransition] = useTransition();
  const [revealing, setRevealing] = useState(false);
  const [cycleLabel, setCycleLabel] = useState<string | null>(null);
  const [result, setResult] = useState<{ courseId: string; courseName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleSelect(playerId: string, courseId: string) {
    setError(null);
    setSelections((prev) => ({ ...prev, [playerId]: courseId }));
    startTransition(async () => {
      try {
        await submitCourseSelection({ matchId, playerId, courseId });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that selection.");
      }
    });
  }

  const pool = Object.values(selections)
    .map((courseId) => courses.find((c) => c.id === courseId))
    .filter((c): c is Course => Boolean(c));

  function handleRandomize() {
    if (pool.length === 0 || revealing) return;
    setError(null);
    setResult(null);
    setRevealing(true);

    intervalRef.current = setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)];
      setCycleLabel(random?.name ?? null);
    }, 90);

    const minDelay = new Promise((resolve) => setTimeout(resolve, 1400));

    Promise.all([randomizeMatchCourse(matchId), minDelay])
      .then(([picked]) => {
        setResult(picked);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong randomizing the course.");
      })
      .finally(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setCycleLabel(null);
        setRevealing(false);
      });
  }

  return (
    <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">{matchLabel}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {participants.map((p) => (
          <div key={p.playerId}>
            <label className="mb-1 block text-sm font-semibold text-ink-900">{p.playerName}&apos;s choice</label>
            <Select
              value={selections[p.playerId] ?? undefined}
              onValueChange={(v) => handleSelect(p.playerId, v)}
              disabled={pending}
            >
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
              <span key={`${c.id}-${i}`} className="rounded-full bg-fairway-50 px-3 py-1 text-xs font-medium text-fairway-700">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-3 border-t border-fairway-900/5 pt-5">
        <button
          type="button"
          onClick={handleRandomize}
          disabled={pool.length === 0 || revealing}
          className="flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 font-bold text-fairway-950 shadow transition-transform hover:scale-105 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <Shuffle className={revealing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {revealing ? "Randomizing…" : "Randomize Course"}
        </button>

        {cycleLabel && <p className="font-display text-xl font-bold text-ink-400">{cycleLabel}</p>}

        {result && (
          <div className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-gold-50 to-white px-6 py-4 text-center">
            <PartyPopper className="h-6 w-6 text-gold-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Official Course Selected</p>
            <p className="font-display text-2xl font-bold text-fairway-900">{result.courseName}</p>
          </div>
        )}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
