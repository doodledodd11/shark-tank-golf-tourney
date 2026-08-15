import type { Player } from "@prisma/client";
import { Crown, MapPin, Trophy, Users } from "lucide-react";
import type { CurrentAssignment } from "@/lib/player-status";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4" };

export function PlayerCard({ player, assignment }: { player: Player; assignment: CurrentAssignment | null }) {
  const isEliminated = player.status === "ELIMINATED";
  const isChampion = player.status === "CHAMPION";

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4 transition-all",
        isChampion && "border-gold-400 bg-gradient-to-br from-gold-50 to-white shadow-md shadow-gold-500/10",
        isEliminated && "border-stone-200 bg-stone-50 opacity-60 grayscale",
        !isEliminated && !isChampion && "border-fairway-900/10 bg-white shadow-sm",
      )}
    >
      {isChampion && (
        <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fairway-950 shadow">
          <Trophy className="h-3 w-3" />
          Champion
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-display text-lg font-bold text-ink-950">
            {player.name}
            {assignment?.isCaptain && <Crown className="h-4 w-4 text-gold-600" aria-label="Captain" />}
          </p>
          {player.hometown && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-700/50">
              <MapPin className="h-3 w-3" />
              {player.hometown}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-fairway-50 px-2.5 py-1 text-xs font-semibold text-fairway-700">
          {TIER_LABELS[player.tier]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {isEliminated && (
          <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-600">
            Eliminated — Round {player.eliminatedRound}
          </span>
        )}
        {player.status === "ACTIVE" && (
          <span className="rounded-full bg-fairway-100 px-2.5 py-1 text-xs font-semibold text-fairway-700">Active</span>
        )}
        {assignment?.isCaptain && (
          <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700">Captain</span>
        )}
      </div>

      {assignment && (
        <div className="mt-3 border-t border-fairway-900/5 pt-3 text-sm text-ink-700/70">
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-ink-700/40" />
            {assignment.team.name}
            <span className="text-ink-700/40">· {assignment.round.name}</span>
          </p>
          {assignment.partner && <p className="mt-1 pl-5 text-ink-700/60">Partner: {assignment.partner.name}</p>}
        </div>
      )}

      {player.handicapIndex != null && (
        <p className="mt-2 text-xs text-ink-700/35">HCP {player.handicapIndex.toFixed(1)} (informational only)</p>
      )}
    </div>
  );
}
