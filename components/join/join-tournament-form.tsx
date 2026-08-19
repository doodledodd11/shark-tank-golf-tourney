"use client";

import { useActionState, useRef, useEffect, useState, type ChangeEvent } from "react";
import { Camera, PartyPopper, UserPlus, UserRound } from "lucide-react";
import { joinTournament, type FormState } from "@/lib/actions/players";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/admin/form-controls";

const initialState: FormState = {};
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function JoinTournamentForm() {
  const [state, formAction] = useActionState(joinTournament, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    // The success branch below replaces this form (and its preview) entirely,
    // so there's nothing to reset beyond the native form fields.
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  // Revoke the object URL whenever it's replaced or the form unmounts, so
  // the browser doesn't hold the file's memory for the whole session.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoError(null);
    setPreview(null); // the cleanup effect above revokes whatever URL this replaces
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Must be a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("That photo is too large, 4MB max.");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

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
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fairway-50 ring-1 ring-fairway-900/10">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: object URL, not a remote/optimizable image
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-7 w-7 text-fairway-300" />
          )}
        </div>
        <Field label="Photo" htmlFor="join-photo" hint={photoError ?? "Optional. JPEG, PNG, or WebP, 4MB max."}>
          <label
            htmlFor="join-photo"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-ink-800 shadow-sm hover:bg-stone-50"
          >
            <Camera className="h-4 w-4" />
            {preview ? "Change Photo" : "Choose Photo"}
          </label>
          <input
            id="join-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
        </Field>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="join-name">
          <input id="join-name" name="name" required maxLength={60} className={inputClass} placeholder="Your full name" />
        </Field>
        <Field
          label="Skill Tier"
          htmlFor="join-tier"
          hint="Not sure? Take your best guess. The admin can adjust this before the draft."
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
        <Field label="Email" htmlFor="join-email" hint="Optional">
          <input id="join-email" name="email" type="email" className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="join-phone" hint="Optional">
          <input id="join-phone" name="phone" type="tel" className={inputClass} />
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
