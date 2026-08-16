"use client";

import { useActionState, useRef, useEffect } from "react";
import { PartyPopper, UserPlus } from "lucide-react";
import { joinTournament, type FormState } from "@/lib/actions/players";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form-controls";

const initialState: FormState = {};

export function JoinTournamentForm() {
  const [state, formAction] = useActionState(joinTournament, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-fairway-900/10 bg-white p-8 text-center shadow-sm">
        <PartyPopper className="h-8 w-8 text-gold-600" />
        <p className="font-display text-xl font-bold text-fairway-900">You&apos;re in!</p>
        <p className="max-w-sm text-sm text-ink-700/60">
          You&apos;ve been added to the field. Check the{" "}
          <a href="/players" className="font-semibold text-fairway-700 hover:text-fairway-900">
            Players
          </a>{" "}
          page to confirm, and reach out to the admin if anything needs fixing.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-fairway-900/10 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="join-name">
          <input id="join-name" name="name" required maxLength={60} className={inputClass} placeholder="Your full name" />
        </Field>
        <Field
          label="Skill Tier"
          htmlFor="join-tier"
          hint="Not sure? Take your best guess — the admin can adjust this before the draft."
        >
          <select id="join-tier" name="tier" defaultValue={2} className={inputClass}>
            {[1, 2, 3, 4].map((t) => (
              <option key={t} value={t}>
                Tier {t} {t === 1 ? "(top)" : t === 4 ? "(beginner)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hometown" htmlFor="join-hometown" hint="Optional">
          <input id="join-hometown" name="hometown" className={inputClass} />
        </Field>
        <Field label="Handicap Index" htmlFor="join-handicap" hint="Optional, informational only">
          <input id="join-handicap" name="handicapIndex" type="number" step="0.1" className={inputClass} />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <SubmitButton pendingText="Joining…">
          <span className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Join the Tournament
          </span>
        </SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
