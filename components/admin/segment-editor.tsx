"use client";

import { useActionState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { MatchWithDetails } from "@/lib/data";
import { addSegment, deleteSegment, updateSegment, type FormState } from "@/lib/actions/matches";
import { MATCH_FORMATS, SEGMENT_STATUSES } from "@/lib/constants";
import { SubmitButton } from "@/components/admin/form-controls";

const initialState: FormState = {};

export function SegmentEditor({ matchId, segments }: { matchId: string; segments: MatchWithDetails["segments"] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <SegmentForm key={segment.id} segment={segment} />
      ))}

      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => addSegment(matchId))}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-medium text-ink-700/60 hover:border-fairway-400 hover:text-fairway-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Segment
      </button>
    </div>
  );
}

function SegmentForm({ segment }: { segment: MatchWithDetails["segments"][number] }) {
  const [state, formAction] = useActionState(updateSegment, initialState);
  const [pending, startTransition] = useTransition();

  return (
    <form action={formAction} className="rounded-xl border border-stone-200 p-4">
      <input type="hidden" name="id" value={segment.id} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <input
          name="name"
          defaultValue={segment.name}
          className="col-span-2 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-2"
          placeholder="Segment name"
        />
        <select name="format" defaultValue={segment.format} className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-2">
          {MATCH_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <input
          name="holes"
          defaultValue={segment.holes ?? ""}
          placeholder="Holes"
          className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-1"
        />
        <input
          name="pointsAvailable"
          type="number"
          step="0.5"
          min={0}
          defaultValue={segment.pointsAvailable}
          className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-1"
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
        <select name="winner" defaultValue={segment.winner ?? ""} className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-2">
          <option value="">Undecided</option>
          <option value="A">Team A wins</option>
          <option value="B">Team B wins</option>
          <option value="TIE">Tie</option>
        </select>
        <select name="status" defaultValue={segment.status} className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-1">
          {SEGMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          name="teamAScore"
          type="number"
          step="0.1"
          defaultValue={segment.teamAScore ?? ""}
          placeholder="Team A score"
          className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-1"
        />
        <input
          name="teamBScore"
          type="number"
          step="0.1"
          defaultValue={segment.teamBScore ?? ""}
          placeholder="Team B score"
          className="col-span-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm sm:col-span-1"
        />
        <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <SubmitButton pendingText="…" className="px-3 py-1.5 text-xs">
            Save
          </SubmitButton>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Delete this segment?")) startTransition(() => deleteSegment(segment.id));
            }}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete segment"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {state.error && <p className="mt-1 text-xs font-medium text-red-600">{state.error}</p>}
    </form>
  );
}
