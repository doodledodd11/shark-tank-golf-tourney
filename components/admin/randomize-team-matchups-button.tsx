"use client";

import { useState, useTransition } from "react";
import { Shuffle } from "lucide-react";
import { randomizeChampionshipTeamMatchups } from "@/lib/actions/matchmaking";

export function RandomizeTeamMatchupsButton({ roundId }: { roundId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await randomizeChampionshipTeamMatchups(roundId);
            if (result.error) setError(result.error);
          });
        }}
        className="flex items-center gap-1.5 rounded-lg bg-fairway-900 px-4 py-2 text-sm font-bold text-cream-50 hover:bg-fairway-800 disabled:opacity-50"
      >
        <Shuffle className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {pending ? "Drawing…" : "Randomize Team Matchups"}
      </button>
      {error && <p className="mt-1 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
