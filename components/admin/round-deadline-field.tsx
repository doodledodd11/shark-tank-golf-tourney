"use client";

import { useState, useTransition } from "react";
import { CalendarClock } from "lucide-react";
import { updateRoundDeadline } from "@/lib/actions/rounds";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function RoundDeadlineField({ roundId, deadline }: { roundId: string; deadline: Date | null }) {
  const [value, setValue] = useState(toDateInputValue(deadline));
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-700/60">
      <CalendarClock className="h-4 w-4" />
      Deadline
      <input
        type="date"
        value={value}
        disabled={pending}
        onChange={(e) => {
          setValue(e.target.value);
          startTransition(() => updateRoundDeadline(roundId, e.target.value));
        }}
        className="rounded-lg border border-stone-300 px-2 py-1 text-sm"
      />
    </label>
  );
}
