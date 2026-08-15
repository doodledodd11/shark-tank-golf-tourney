"use client";

import { useActionState, useRef, useEffect } from "react";
import { UserPlus } from "lucide-react";
import { createPlayer, type FormState } from "@/lib/actions/players";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form-controls";

const initialState: FormState = {};

export function AddPlayerForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction] = useActionState(createPlayer, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-ink-950">
        <UserPlus className="h-4 w-4" />
        Add Player
      </p>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="new-name">
            <input id="new-name" name="name" required className={inputClass} placeholder="Player 33" />
          </Field>
        </div>
        <Field label="Tier" htmlFor="new-tier">
          <select id="new-tier" name="tier" defaultValue={1} className={inputClass}>
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={t}>
                Tier {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hometown" htmlFor="new-hometown">
          <input id="new-hometown" name="hometown" className={inputClass} />
        </Field>
        <Field label="Handicap" htmlFor="new-handicap">
          <input id="new-handicap" name="handicapIndex" type="number" step="0.1" className={inputClass} />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <SubmitButton>Add Player</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
