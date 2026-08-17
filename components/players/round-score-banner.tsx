import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RoundScoreBanner({
  teamAName,
  teamBName,
  teamATotal,
  teamBTotal,
  pointsPlayed,
  pointsAvailable,
}: {
  teamAName: string;
  teamBName: string;
  teamATotal: number;
  teamBTotal: number;
  pointsPlayed: number;
  pointsAvailable: number;
}) {
  return (
    <div className="rounded-2xl bg-fairway-950 fairway-texture px-6 py-8 text-center shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">Round Score</p>
      <p className="mt-3 font-display text-3xl font-bold text-cream-50 sm:text-5xl">
        <span className={cn(teamATotal > teamBTotal && "text-gold-400")}>
          {teamAName} {formatPoints(teamATotal)}
        </span>
        <span className="mx-3 text-cream-100/30">,</span>
        <span className={cn(teamBTotal > teamATotal && "text-gold-400")}>
          {teamBName} {formatPoints(teamBTotal)}
        </span>
      </p>
      <p className="mt-2 text-xs text-cream-100/40">
        {formatPoints(pointsPlayed)} of {pointsAvailable} points decided
      </p>
    </div>
  );
}
