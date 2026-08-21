"use client";

import { useActionState, useState, useTransition } from "react";
import type { Player } from "@prisma/client";
import { ArrowLeftRight, ChevronDown, Trash2 } from "lucide-react";
import { updatePlayer, deletePlayer, type FormState } from "@/lib/actions/players";
import { movePlayerToOtherTeam } from "@/lib/actions/rounds";
import type { CurrentAssignment } from "@/lib/player-status";
import { PLAYER_STATUSES } from "@/lib/constants";
import { SubmitButton, inputClass } from "@/components/admin/form-controls";
import { cn } from "@/lib/utils";

const initialState: FormState = {};

export function PlayerRow({
  player,
  canDelete,
  assignment,
}: {
  player: Player;
  canDelete: boolean;
  assignment: CurrentAssignment | null;
}) {
  const [state, formAction] = useActionState(updatePlayer, initialState);
  const [status, setStatus] = useState(player.status);
  const [deleting, startDeleteTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [moving, startMoveTransition] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const otherTeam = assignment?.round.teams.find((t) => t.id !== assignment.team.id) ?? null;

  function handleMove() {
    if (!assignment || !otherTeam) return;
    setMoveError(null);
    startMoveTransition(async () => {
      const result = await movePlayerToOtherTeam({
        playerId: player.id,
        roundId: assignment.round.id,
        fromTeamId: assignment.team.id,
        toTeamId: otherTeam.id,
      });
      if (result.error) setMoveError(result.error);
    });
  }

  return (
    <form action={formAction} className="border-b border-stone-100 px-3 py-2.5 text-sm last:border-0">
      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] items-center gap-2">
        <input type="hidden" name="id" value={player.id} />

      <input name="name" defaultValue={player.name} className={`${inputClass} col-span-3 py-1.5`} />

      <select name="tier" defaultValue={player.tier} className={`${inputClass} col-span-1 py-1.5`}>
        {[1, 2, 3, 4].map((t) => (
          <option key={t} value={t}>
            T{t}
          </option>
        ))}
      </select>

      <div className="col-span-2 flex items-center gap-1.5 overflow-hidden">
        {assignment ? (
          <>
            <span className="truncate text-xs font-medium text-ink-800" title={assignment.round.name}>
              {assignment.team.name}
            </span>
            {otherTeam && (
              <button
                type="button"
                disabled={moving}
                onClick={handleMove}
                title={`Move to ${otherTeam.name}`}
                aria-label={`Move ${player.name} to ${otherTeam.name}`}
                className="shrink-0 rounded p-1 text-stone-400 hover:bg-fairway-50 hover:text-fairway-700 disabled:opacity-50"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-ink-700/30">—</span>
        )}
      </div>

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
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide more details" : "Show more details"}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-fairway-50 hover:text-fairway-700"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
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

        {state.error && <p className="col-span-[14] text-xs font-medium text-red-600">{state.error}</p>}
        {moveError && <p className="col-span-[14] text-xs font-medium text-red-600">{moveError}</p>}
      </div>

      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-stone-100 pt-2 sm:grid-cols-3 lg:grid-cols-6">
          <input
            name="seed"
            type="number"
            min={1}
            max={8}
            defaultValue={player.seed ?? ""}
            placeholder="Seed (1-8)"
            title="Rank within this player's tier, from GHIN/handicap seeding"
            className={`${inputClass} py-1.5`}
          />
          <input name="email" type="email" defaultValue={player.email ?? ""} placeholder="Email" className={`${inputClass} py-1.5`} />
          <input name="phone" type="tel" defaultValue={player.phone ?? ""} placeholder="Phone" className={`${inputClass} py-1.5`} />
          <select name="gender" defaultValue={player.gender ?? ""} className={`${inputClass} py-1.5`}>
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input name="whsId" defaultValue={player.whsId ?? ""} placeholder="WHS / GHIN ID" className={`${inputClass} py-1.5`} />
          <input
            name="preferredTee"
            defaultValue={player.preferredTee ?? ""}
            placeholder="Tee (e.g. Black)"
            className={`${inputClass} py-1.5`}
          />
          <select name="transport" defaultValue={player.transport ?? ""} className={`${inputClass} py-1.5`}>
            <option value="">Transport</option>
            <option value="Walking">Walking</option>
            <option value="Cart">Cart</option>
          </select>
        </div>
      )}
    </form>
  );
}
