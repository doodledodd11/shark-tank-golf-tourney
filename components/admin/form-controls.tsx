"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-ink-950 shadow-sm outline-none focus:border-fairway-600 focus:ring-2 focus:ring-fairway-600/20";

export const labelClass = "mb-1 block text-sm font-medium text-ink-800";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-700/50">{hint}</p>}
    </div>
  );
}

export function SubmitButton({
  children,
  className,
  pendingText = "Saving…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-fairway-700 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ error, success }: { error?: string; success?: boolean }) {
  if (error) return <p className="text-sm font-medium text-red-600">{error}</p>;
  if (success) return <p className="text-sm font-medium text-fairway-700">Saved.</p>;
  return null;
}
