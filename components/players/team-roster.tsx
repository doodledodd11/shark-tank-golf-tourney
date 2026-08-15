import { Crown } from "lucide-react";
import type { TeamWithRoster } from "@/lib/data";
import { cn } from "@/lib/utils";

export function TeamRoster({ team }: { team: TeamWithRoster }) {
  const byTier: Record<number, TeamWithRoster["memberships"]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const m of team.memberships) byTier[m.player.tier]?.push(m);

  return (
    <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl font-bold text-fairway-900">{team.name}</h3>
        {team.captain && (
          <span className="flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-700">
            <Crown className="h-3.5 w-3.5" />
            {team.captain.name}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-700/40">{team.memberships.length} players</p>

      <div className="mt-4 space-y-3">
        {[1, 2, 3, 4].map((tier) => {
          const members = byTier[tier] ?? [];
          if (members.length === 0) return null;
          return (
            <div key={tier}>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">Tier {tier}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {members.map(({ player }) => (
                  <span
                    key={player.id}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm",
                      player.status === "ELIMINATED"
                        ? "border-stone-200 bg-stone-50 text-stone-400 line-through"
                        : "border-fairway-900/10 bg-fairway-50/60 text-ink-900",
                      player.id === team.captainId && "border-gold-400 bg-gold-50 font-semibold text-gold-800",
                    )}
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
