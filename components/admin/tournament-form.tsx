"use client";

import { useActionState } from "react";
import type { Tournament } from "@prisma/client";
import { updateTournament, type FormState } from "@/lib/actions/tournament";
import { TOURNAMENT_STATUSES, TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, inputClass, labelClass } from "@/components/admin/form-controls";

const initialState: FormState = {};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function TournamentForm({ tournament }: { tournament: Tournament }) {
  const [state, formAction] = useActionState(updateTournament, initialState);

  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="id" value={tournament.id} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Tournament Name" htmlFor="name">
          <input id="name" name="name" defaultValue={tournament.name} required className={inputClass} />
        </Field>
        <Field label="Season" htmlFor="season">
          <input
            id="season"
            name="season"
            type="number"
            defaultValue={tournament.season}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Subtitle" htmlFor="subtitle" hint="Shown under the tournament name on the homepage hero.">
        <input id="subtitle" name="subtitle" defaultValue={tournament.subtitle} required className={inputClass} />
      </Field>

      <Field label="Description" htmlFor="description">
        <textarea
          id="description"
          name="description"
          defaultValue={tournament.description ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <Field label="Tournament Status" htmlFor="status" hint="Drives the status banner and progression tracker on the homepage.">
        <select id="status" name="status" defaultValue={tournament.status} className={inputClass}>
          {TOURNAMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TOURNAMENT_STATUS_LABELS[s as TournamentStatus]}
            </option>
          ))}
        </select>
      </Field>

      <div className="border-t border-stone-100 pt-5">
        <p className={labelClass}>Prize Pool</p>
        <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Current Prize Pool ($)" htmlFor="prizePoolDollars">
            <input
              id="prizePoolDollars"
              name="prizePoolDollars"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(tournament.prizePoolCents / 100).toFixed(2)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Entry Fee ($)" htmlFor="entryFeeDollars" hint="Leave blank if not finalized.">
            <input
              id="entryFeeDollars"
              name="entryFeeDollars"
              type="number"
              min={0}
              step="0.01"
              defaultValue={tournament.entryFeeCents != null ? (tournament.entryFeeCents / 100).toFixed(2) : ""}
              className={inputClass}
            />
          </Field>
          <Field label="Paid Players" htmlFor="paidPlayerCount" hint="Leave blank if not tracked yet.">
            <input
              id="paidPlayerCount"
              name="paidPlayerCount"
              type="number"
              min={0}
              defaultValue={tournament.paidPlayerCount ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="mt-5 max-w-xs">
          <Field
            label="Championship Split Size"
            htmlFor="championshipSplitSize"
            hint="Number of players who split the prize pool."
          >
            <input
              id="championshipSplitSize"
              name="championshipSplitSize"
              type="number"
              min={1}
              defaultValue={tournament.championshipSplitSize}
              required
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      <div className="max-w-xs border-t border-stone-100 pt-5">
        <Field label="Start Date" htmlFor="startDate">
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(tournament.startDate)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-4 border-t border-stone-100 pt-5">
        <SubmitButton>Save Tournament Settings</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
