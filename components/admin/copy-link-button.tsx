"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies an absolute URL built from the given path and the page's own
 * origin — works unchanged on localhost, the vercel.app preview domain, or
 * a future custom domain, with no site-URL config to keep in sync. */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-800 hover:bg-stone-50"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-fairway-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy Link"}
    </button>
  );
}
