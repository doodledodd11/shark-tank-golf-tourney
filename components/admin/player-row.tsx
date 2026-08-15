"use client";

import { useActionState, useState, useTransition } from "react";
import type { Player } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { updatePlayer, deletePlayer, type FormState } from "@/lib/actions/players";
import { PLAYER_STATUSES } from "@/lib/constants";
import { SubmitButton, inputClass } from "@/components/admin/form-controls";

const initialState: FormState = {};

export function PlayerRow({ player, canDelete }: { player: Player; canDelete: boolean }) {
  const [state, formAction] = useActionState(updatePlayer, initialState);
  const [status, setStatus] = useState(player.status);
  const [deleting, startDeleteTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <form action={formAction} className="grid grid-cols-12 items-center gap-2 border-b border-stone-100 px-3 py-2.5 text-sm last:border-0">
      <input type="hidden" name="id" value={player.id} />

      <input name="name" defaultValue={player.name} className={`${inputClass} col-span-3 py-1.5`} />

      <select name="tier" defaultValue={player.tier} className={`${inputClass} col-span-1 py-1.5`}>
        {[1, 2, 3, 4].map((t) => (
          <option key={t} value={t}>
            T{t}
          </option>
        ))}
      </select>

      <select
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value as Player["status"])}
        className={`${inputClass} col-span-2 py-1.5`}
      >
        {PLAYER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        name="eliminatedRound"
        type="number"
        min={1}
        max={3}
        placeholder="Rnd"
        defaultValue={player.eliminatedRound ?? ""}
        disabled={status !== "ELIMINATED"}
        className={`${inputClass} col-span-1 py-1.5 disabled:bg-stone-100 disabled:text-stone-400`}
      />

      <input name="hometown" defaultValue={player.hometown ?? ""} placeholder="Hometown" className={`${inputClass} col-span-2 py-1.5`} />

      <input
        name="handicapIndex"
        type="number"
        step="0.1"
        defaultValue={player.handicapIndex ?? ""}
        placeholder="HCP"
        className={`${inputClass} col-span-1 py-1.5`}
      />

      <div className="col-span-2 flex items-center justify-end gap-2">
        <SubmitButton pendingText="…" className="px-3 py-1.5 text-xs">
          Save
        </SubmitButton>
        {canDelete &&
          (confirmingDelete ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => startDeleteTransition(() => deletePlayer(player.id))}
              className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Confirm?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove ${player.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ))}
      </div>

      {state.error && <p className="col-span-12 text-xs font-medium text-red-600">{state.error}</p>}
    </form>
  );
}
