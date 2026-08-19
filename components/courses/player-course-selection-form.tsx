"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitCourseSelection } from "@/lib/actions/course-selection";
import type { PlayerCourseSelectionData } from "@/lib/course-selection";

export function PlayerCourseSelectionForm({ token, data }: { token: string; data: PlayerCourseSelectionData }) {
  const [courseId, setCourseId] = useState(data.currentCourseId ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (data.decided) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-fairway-900/10 bg-white p-8 text-center shadow-sm">
        <PartyPopper className="h-7 w-7 text-gold-600" />
        <p className="font-display text-xl font-bold text-fairway-900">This match is already set</p>
        <p className="text-sm text-ink-700/60">
          The official course was decided: <span className="font-semibold text-ink-900">{data.decidedCourseName}</span>
        </p>
      </div>
    );
  }

  function handleChange(value: string) {
    setCourseId(value);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await submitCourseSelection({ matchId: data.matchId, playerId: data.playerId, courseId: value, accessToken: token });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save that selection.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-fairway-900/10 bg-white p-6 shadow-sm">
      <p className="text-sm text-ink-700/60">
        Hi <span className="font-semibold text-ink-900">{data.playerName}</span>, pick your preferred course below.
        The tournament admin will run the random draw once everyone in this match has chosen.
      </p>
      <div className="mt-4">
        <Select value={courseId || undefined} onValueChange={handleChange} disabled={pending}>
          <SelectTrigger>
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {data.courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {saved && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-fairway-700">
          <CheckCircle2 className="h-4 w-4" />
          Saved. You can change your pick any time before the draw runs.
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
