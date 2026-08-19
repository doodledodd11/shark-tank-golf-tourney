"use client";

import { useState, useTransition } from "react";
import { setFirstAnnouncer } from "@/lib/actions/matchmaking";

export function SetFirstAnnouncerField({
  roundId,
  teams,
  currentFirstAnnouncerTeamId,
}: {
  roundId: string;
  teams: { id: string; name: string }[];
  currentFirstAnnouncerTeamId: string | null;
}) {
  const [value, setValue] = useState(currentFirstAnnouncerTeamId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label htmlFor="first-announcer" className="font-semibold text-ink-700/60">
        Who announces first?
      </label>
      <select
        id="first-announcer"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const teamId = e.target.value || null;
          setValue(e.target.value);
          setError(null);
          startTransition(async () => {
            const result = await setFirstAnnouncer(roundId, teamId);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-lg border border-stone-300 px-2 py-1 text-xs shadow-sm focus:border-fairway-500 focus:outline-none"
      >
        <option value="">Default ({teams[0]?.name})</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error && <span className="font-medium text-red-600">{error}</span>}
    </div>
  );
}
