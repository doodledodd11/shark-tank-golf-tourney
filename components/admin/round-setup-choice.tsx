"use client";

import { useState, useTransition } from "react";
import type { Player } from "@prisma/client";
import { Shuffle, Users } from "lucide-react";
import { initializeRoundTeams } from "@/lib/actions/rounds";
import { startDraft } from "@/lib/actions/draft";
import { inputClass } from "@/components/admin/form-controls";

export function RoundSetupChoice({ roundId, eligiblePlayers }: { roundId: string; eligiblePlayers: Player[] }) {
  const [mode, setMode] = useState<"choice" | "live-draft">("choice");
  const [pending, startTransition] = useTransition();
  const [captainA, setCaptainA] = useState("");
  const [captainB, setCaptainB] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (mode === "choice") {
    return (
      <div className="rounded-2xl border border-dashed border-fairway-400/50 bg-fairway-50/40 p-8 text-center">
        <Users className="mx-auto h-7 w-7 text-fairway-500" />
        <p className="mt-2 font-display text-lg font-semibold text-fairway-900">Set up this round&apos;s teams</p>
        <p className="mt-1 text-sm text-ink-700/60">
          Run a live draft the captains use themselves, or build the roster yourself.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMode("live-draft")}
            className="flex items-center gap-2 rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-fairway-700"
          >
            <Shuffle className="h-4 w-4" />
            Start Live Draft
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => initializeRoundTeams(roundId))}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-stone-50 disabled:opacity-50"
          >
            Build Roster Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="font-semibold text-ink-950">Start Live Draft</p>
      <p className="mt-1 text-sm text-ink-700/60">
        Pick each team&apos;s captain — they draft the rest live, using their own link. Nobody else needs an account.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">Team A Captain</label>
          <select value={captainA} onChange={(e) => setCaptainA(e.target.value)} className={inputClass}>
            <option value="">Select a player</option>
            {eligiblePlayers.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === captainB}>
                {p.name} (Tier {p.tier})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-800">Team B Captain</label>
          <select value={captainB} onChange={(e) => setCaptainB(e.target.value)} className={inputClass}>
            <option value="">Select a player</option>
            {eligiblePlayers.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === captainA}>
                {p.name} (Tier {p.tier})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !captainA || !captainB}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await startDraft({ roundId, captainAPlayerId: captainA, captainBPlayerId: captainB });
              // On success the round now has teams + tokens, so the admin
              // page's own re-render (via revalidatePath inside startDraft)
              // swaps this component out for the live-draft panel — no
              // client-side state to manage for the success case.
              if (result.error) setError(result.error);
            });
          }}
          className="rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-50"
        >
          {pending ? "Starting…" : "Start the Draft"}
        </button>
        <button type="button" onClick={() => setMode("choice")} className="text-sm text-ink-700/60 hover:text-ink-900">
          Cancel
        </button>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
