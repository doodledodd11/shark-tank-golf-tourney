"use client";

import { useActionState, useEffect, useRef } from "react";
import { MapPinPlus } from "lucide-react";
import { createCourse, type FormState } from "@/lib/actions/courses";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form-controls";

const initialState: FormState = {};

export function AddCourseForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction] = useActionState(createCourse, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 font-semibold text-ink-950">
        <MapPinPlus className="h-4 w-4" />
        Add Course
      </p>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="c-name">
            <input id="c-name" name="name" required className={inputClass} />
          </Field>
        </div>
        <Field label="City" htmlFor="c-city">
          <input id="c-city" name="city" className={inputClass} />
        </Field>
        <Field label="State" htmlFor="c-state">
          <input id="c-state" name="state" className={inputClass} />
        </Field>
        <Field label="Price Range" htmlFor="c-price">
          <input id="c-price" name="priceRange" placeholder="$40-60" className={inputClass} />
        </Field>
        <Field label="Website" htmlFor="c-website">
          <input id="c-website" name="website" placeholder="https://…" className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes" htmlFor="c-notes">
          <input id="c-notes" name="notes" className={inputClass} />
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <SubmitButton>Add Course</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
