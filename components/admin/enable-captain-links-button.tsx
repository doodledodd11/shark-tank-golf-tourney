"use client";

import { useState, useTransition } from "react";
import { Radio } from "lucide-react";
import { ensureCaptainAccessTokens } from "@/lib/actions/matchmaking";

export function EnableCaptainLinksButton({ roundId, label }: { roundId: string; label: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await ensureCaptainAccessTokens(roundId);
            if (result.error) setError(result.error);
          });
        }}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-fairway-800 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-60"
      >
        <Radio className="h-3.5 w-3.5" />
        {pending ? "Enabling…" : label}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
