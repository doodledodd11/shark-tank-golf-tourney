"use client";

import { useActionState, useState, useTransition } from "react";
import { Lock, LockOpen, Trash2 } from "lucide-react";
import type { RoundWithDetails, TeamWithRoster } from "@/lib/data";
import { createPairing, deletePairing, togglePairingLocked, type FormState } from "@/lib/actions/pairings";
import { SubmitButton } from "@/components/admin/form-controls";

const initialState: FormState = {};

export function RoundPairingsManager({ round, teams }: { round: RoundWithDetails; teams: TeamWithRoster[] }) {
  if (teams.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {teams.map((team) => (
        <TeamPairings key={team.id} round={round} team={team} />
      ))}
    </div>
  );
}

function TeamPairings({ round, team }: { round: RoundWithDetails; team: TeamWithRoster }) {
  const [state, formAction] = useActionState(createPairing, initialState);
  const pairings = round.pairings.filter((p) => p.teamId === team.id);
  const pairedPlayerIds = new Set(pairings.flatMap((p) => [p.player1Id, p.player2Id]));
  const unpaired = team.memberships.map((m) => m.player).filter((p) => !pairedPlayerIds.has(p.id));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="font-semibold text-ink-950">{team.name} Twosomes</p>

      <div className="mt-3 space-y-2">
        {pairings.length === 0 && <p className="text-sm text-ink-700/40">No twosomes yet.</p>}
        {pairings.map((pairing) => (
          <PairingRow key={pairing.id} pairing={pairing} />
        ))}
      </div>

      {unpaired.length >= 2 && (
        <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4">
          <input type="hidden" name="roundId" value={round.id} />
          <input type="hidden" name="teamId" value={team.id} />
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-700/60">Player 1</label>
            <select name="player1Id" required className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {unpaired.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-700/60">Player 2</label>
            <select name="player2Id" required className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
              <option value="">Select…</option>
              {unpaired.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="px-3 py-1.5 text-xs">Add Twosome</SubmitButton>
        </form>
      )}
      {state.error && <p className="mt-2 text-xs font-medium text-red-600">{state.error}</p>}
    </div>
  );
}

function PairingRow({ pairing }: { pairing: RoundWithDetails["pairings"][number] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-fairway-50/60 px-3 py-2 text-sm">
      <span className="font-medium text-ink-900">
        {pairing.player1.name} + {pairing.player2.name}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => togglePairingLocked(pairing.id, !pairing.locked))}
          className="rounded p-1 text-stone-500 hover:bg-stone-200"
          aria-label={pairing.locked ? "Unlock twosome" : "Lock twosome"}
          title={pairing.locked ? "Locked" : "Unlocked"}
        >
          {pairing.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                await deletePairing(pairing.id);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't delete.");
              }
            })
          }
          className="rounded p-1 text-stone-500 hover:bg-red-100 hover:text-red-600"
          aria-label="Delete twosome"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
