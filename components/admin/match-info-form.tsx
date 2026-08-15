"use client";

import { useActionState } from "react";
import type { Course } from "@prisma/client";
import type { MatchWithDetails } from "@/lib/data";
import { updateMatchDetails, type FormState } from "@/lib/actions/matches";
import { MATCH_STATUSES, MATCH_STATUS_LABELS, type MatchStatus } from "@/lib/constants";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form-controls";

const initialState: FormState = {};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function MatchInfoForm({ match, courses }: { match: MatchWithDetails; courses: Course[] }) {
  const [state, formAction] = useActionState(updateMatchDetails, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={match.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="courseId">
          <select id="courseId" name="courseId" defaultValue={match.courseId ?? ""} className={inputClass}>
            <option value="">TBD</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scheduled Date" htmlFor="scheduledDate">
          <input
            id="scheduledDate"
            name="scheduledDate"
            type="date"
            defaultValue={toDateInputValue(match.scheduledDate)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Status" htmlFor="status">
        <select id="status" name="status" defaultValue={match.status} className={inputClass}>
          {MATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MATCH_STATUS_LABELS[s as MatchStatus]}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Golf GameBook Event URL" htmlFor="gameBookEventUrl">
          <input
            id="gameBookEventUrl"
            name="gameBookEventUrl"
            defaultValue={match.gameBookEventUrl ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        <Field label="Golf GameBook Leaderboard URL" htmlFor="gameBookLeaderboardUrl">
          <input
            id="gameBookLeaderboardUrl"
            name="gameBookLeaderboardUrl"
            defaultValue={match.gameBookLeaderboardUrl ?? ""}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Other External Scoring URL" htmlFor="externalScoringUrl">
        <input
          id="externalScoringUrl"
          name="externalScoringUrl"
          defaultValue={match.externalScoringUrl ?? ""}
          placeholder="https://…"
          className={inputClass}
        />
      </Field>

      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" defaultValue={match.notes ?? ""} rows={2} className={inputClass} />
      </Field>

      <div className="flex items-center gap-4 border-t border-stone-100 pt-4">
        <SubmitButton>Save Match Details</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
