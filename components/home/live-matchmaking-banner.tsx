import Link from "next/link";
import { Swords } from "lucide-react";

/** Sits above the Hero when a round's live matchmaking is actively running
 * — the only way a regular visitor would otherwise discover
 * /matchmaking/[roundId] exists. */
export function LiveMatchmakingBanner({ roundId, roundName }: { roundId: string; roundName: string }) {
  return (
    <Link
      href={`/matchmaking/${roundId}`}
      className="block bg-gold-500 px-4 py-3 text-center text-sm font-semibold text-fairway-950 transition-colors hover:bg-gold-400 sm:text-base"
    >
      <span className="inline-flex items-center gap-2">
        <Swords className="h-4 w-4 animate-pulse" />
        {roundName} matchmaking is live right now, watch it happen
      </span>
    </Link>
  );
}
