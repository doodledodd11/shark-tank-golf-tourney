"use client";

import { useActionState, useState } from "react";
import type { RoundWithDetails, TeamWithRoster } from "@/lib/data";
import { createMatchFromPairings, createMatchFromPlayers, type FormState } from "@/lib/actions/matches";
import { SEGMENT_TEMPLATE_LABELS } from "@/lib/segment-templates";
import { SubmitButton } from "@/components/admin/form-controls";
import { cn } from "@/lib/utils";

const initialState: FormState = {};

export function RoundMatchCreator({ round, teams }: { round: RoundWithDetails; teams: TeamWithRoster[] }) {
  const [mode, setMode] = useState<"pairings" | "players">(round.number === 3 ? "players" : "pairings");
  if (teams.length !== 2) return null;
  const [teamA, teamB] = teams;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-950">Create Match</p>
        <div className="flex rounded-full bg-stone-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("pairings")}
            className={cn("rounded-full px-3 py-1", mode === "pairings" ? "bg-white shadow-sm" : "text-stone-500")}
          >
            From Twosomes
          </button>
          <button
            type="button"
            onClick={() => setMode("players")}
            className={cn("rounded-full px-3 py-1", mode === "players" ? "bg-white shadow-sm" : "text-stone-500")}
          >
            Pick Players
          </button>
        </div>
      </div>

      {mode === "pairings" ? (
        <PairingsMatchForm round={round} teamA={teamA!} teamB={teamB!} />
      ) : (
        <PlayersMatchForm round={round} teamA={teamA!} teamB={teamB!} />
      )}
    </div>
  );
}

function PairingsMatchForm({ round, teamA, teamB }: { round: RoundWithDetails; teamA: TeamWithRoster; teamB: TeamWithRoster }) {
  const [state, formAction] = useActionState(createMatchFromPairings, initialState);
  const matchedPairingIds = new Set(round.matches.flatMap((m) => [m.pairingAId, m.pairingBId].filter(Boolean)));
  const availableA = round.pairings.filter((p) => p.teamId === teamA.id && !matchedPairingIds.has(p.id));
  const availableB = round.pairings.filter((p) => p.teamId === teamB.id && !matchedPairingIds.has(p.id));
  const template = round.number === 1 ? "ROUND_1" : "ROUND_2";

  if (availableA.length === 0 || availableB.length === 0) {
    return <p className="mt-3 text-sm text-ink-700/50">No unmatched twosomes remain on both teams.</p>;
  }

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <input type="hidden" name="roundId" value={round.id} />
      <input type="hidden" name="teamAId" value={teamA.id} />
      <input type="hidden" name="teamBId" value={teamB.id} />
      <input type="hidden" name="template" value={template} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-700/60">{teamA.name} twosome</label>
          <select name="pairingAId" required className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">Select…</option>
            {availableA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.player1.name} + {p.player2.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-700/60">{teamB.name} twosome</label>
          <select name="pairingBId" required className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
            <option value="">Select…</option>
            {availableB.map((p) => (
              <option key={p.id} value={p.id}>
                {p.player1.name} + {p.player2.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-ink-700/50">Segments: {SEGMENT_TEMPLATE_LABELS[template]}</p>
      <SubmitButton className="px-3 py-1.5 text-xs">Create Match</SubmitButton>
      {state.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
    </form>
  );
}

function PlayersMatchForm({ round, teamA, teamB }: { round: RoundWithDetails; teamA: TeamWithRoster; teamB: TeamWithRoster }) {
  const [template, setTemplate] = useState<keyof typeof SEGMENT_TEMPLATE_LABELS>(
    round.number === 3 ? "CHAMPIONSHIP_TEAM" : "PLAYOFF",
  );
  const [sideA, setSideA] = useState<string[]>([]);
  const [sideB, setSideB] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function handleSubmit(formData: FormData) {
    formData.set("roundId", round.id);
    formData.set("teamAId", teamA.id);
    formData.set("teamBId", teamB.id);
    formData.set("template", template);
    for (const id of sideA) formData.append("sideAPlayerIds", id);
    for (const id of sideB) formData.append("sideBPlayerIds", id);

    setPending(true);
    setMessage(null);
    const result = await createMatchFromPlayers(formData);
    setPending(false);
    if (result.error) {
      setMessage(result.error);
    } else {
      setSideA([]);
      setSideB([]);
      setMessage("Match created.");
    }
  }

  return (
    <form action={handleSubmit} className="mt-3 space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-700/60">Match type</label>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value as keyof typeof SEGMENT_TEMPLATE_LABELS)}
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:w-auto"
        >
          {Object.entries(SEGMENT_TEMPLATE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlayerChecklist label={`${teamA.name} players`} players={teamA.memberships.map((m) => m.player)} selected={sideA} onToggle={(id) => toggle(sideA, setSideA, id)} />
        <PlayerChecklist label={`${teamB.name} players`} players={teamB.memberships.map((m) => m.player)} selected={sideB} onToggle={(id) => toggle(sideB, setSideB, id)} />
      </div>

      <button
        type="submit"
        disabled={pending || sideA.length === 0 || sideB.length === 0}
        className="rounded-lg bg-fairway-800 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create Match"}
      </button>
      {message && <p className="text-xs text-ink-700/60">{message}</p>}
    </form>
  );
}

function PlayerChecklist({
  label,
  players,
  selected,
  onToggle,
}: {
  label: string;
  players: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-700/60">{label}</label>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2">
        {players.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => onToggle(p.id)} />
            {p.name}
          </label>
        ))}
      </div>
    </div>
  );
}
