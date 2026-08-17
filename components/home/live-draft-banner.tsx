import Link from "next/link";
import { Radio } from "lucide-react";

/** Sits above the Hero when a round has a live draft actively running —
 * the only way a regular visitor (as opposed to an admin, or a captain
 * with their own link) would otherwise discover /draft/[roundId] exists. */
export function LiveDraftBanner({ roundId, roundName }: { roundId: string; roundName: string }) {
  return (
    <Link
      href={`/draft/${roundId}`}
      className="block bg-gold-500 px-4 py-3 text-center text-sm font-semibold text-fairway-950 transition-colors hover:bg-gold-400 sm:text-base"
    >
      <span className="inline-flex items-center gap-2">
        <Radio className="h-4 w-4 animate-pulse" />
        {roundName} draft is live right now, watch it happen
      </span>
    </Link>
  );
}
