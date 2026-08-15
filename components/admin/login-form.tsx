"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="from" value={from} />

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-cream-100/80">
          Administrator password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-cream-50/15 bg-fairway-900/60 px-4 py-2.5 text-cream-50 outline-none placeholder:text-cream-100/30 focus:border-gold-500/70 focus:ring-2 focus:ring-gold-500/30"
          placeholder="••••••••••"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2.5 font-semibold text-fairway-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
      >
        <Lock className="h-4 w-4" />
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
