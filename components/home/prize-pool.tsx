import { Coins, Trophy, Users, Wallet } from "lucide-react";
import { formatCents } from "@/lib/format";
import { calculatePrizePerPlayer } from "@/lib/tournament-logic";

export function PrizePool({
  prizePoolCents,
  entryFeeCents,
  paidPlayerCount,
  championshipSplitSize,
}: {
  prizePoolCents: number;
  entryFeeCents: number | null;
  paidPlayerCount: number | null;
  championshipSplitSize: number;
}) {
  const perPlayer = calculatePrizePerPlayer(prizePoolCents, championshipSplitSize);

  const stats = [
    { icon: Wallet, label: "Entry Fee", value: entryFeeCents != null ? formatCents(entryFeeCents) : "TBD" },
    { icon: Users, label: "Paid Players", value: paidPlayerCount != null ? String(paidPlayerCount) : "TBD" },
    { icon: Trophy, label: "Championship Split", value: `${championshipSplitSize} Players` },
    { icon: Coins, label: "Per Winning Player", value: perPlayer > 0 ? formatCents(perPlayer) : "TBD" },
  ];

  return (
    <section className="bg-cream-50 py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fairway-600">Current Prize Pool</p>
        <p className="mt-3 font-display text-6xl font-bold text-fairway-900 sm:text-7xl">
          {formatCents(prizePoolCents)}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-700/60">
          Winner-take-all for the four champions. Grows as more players lock in their entry.
        </p>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-fairway-900/10 bg-white px-3 py-5 shadow-sm">
              <Icon className="mx-auto h-4 w-4 text-gold-600" />
              <p className="mt-2 font-display text-xl font-bold text-fairway-900">{value}</p>
              <p className="mt-0.5 text-xs text-ink-700/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
