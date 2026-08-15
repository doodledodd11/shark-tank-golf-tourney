"use client";

import { useActionState, useState, useTransition } from "react";
import type { Course } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { updateCourse, deleteCourse, toggleCourseActive, type FormState } from "@/lib/actions/courses";
import { SubmitButton, inputClass } from "@/components/admin/form-controls";
import { cn } from "@/lib/utils";

const initialState: FormState = {};

export function CourseRow({ course }: { course: Course }) {
  const [state, formAction] = useActionState(updateCourse, initialState);
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="border-b border-stone-100 p-4 last:border-0">
      <form action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
        <input type="hidden" name="id" value={course.id} />
        <input name="name" defaultValue={course.name} placeholder="Course name" className={`${inputClass} sm:col-span-3`} />
        <input name="city" defaultValue={course.city ?? ""} placeholder="City" className={`${inputClass} sm:col-span-2`} />
        <input name="state" defaultValue={course.state ?? ""} placeholder="State" className={`${inputClass} sm:col-span-1`} />
        <input
          name="priceRange"
          defaultValue={course.priceRange ?? ""}
          placeholder="$40-60"
          className={`${inputClass} sm:col-span-2`}
        />
        <input
          name="website"
          defaultValue={course.website ?? ""}
          placeholder="https://…"
          className={`${inputClass} sm:col-span-2`}
        />
        <input name="notes" defaultValue={course.notes ?? ""} placeholder="Notes" className={`${inputClass} sm:col-span-2`} />

        <div className="flex items-center gap-2 sm:col-span-12 sm:mt-2">
          <SubmitButton pendingText="Saving…" className="px-3 py-1.5 text-xs">
            Save
          </SubmitButton>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await toggleCourseActive(course.id, !course.active);
              })
            }
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              course.active ? "bg-fairway-100 text-fairway-700" : "bg-stone-200 text-stone-600",
            )}
          >
            {course.active ? "Active" : "Inactive"} — click to toggle
          </button>

          <div className="ml-auto">
            {confirmingDelete ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await deleteCourse(course.id);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Couldn't delete this course.");
                      setConfirmingDelete(false);
                    }
                  })
                }
                className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm delete?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${course.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>
      {(state.error || error) && <p className="mt-2 text-xs font-medium text-red-600">{state.error || error}</p>}
    </div>
  );
}
