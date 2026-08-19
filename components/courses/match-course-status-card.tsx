import { CheckCircle2, Circle } from "lucide-react";

export function MatchCourseStatusCard({
  matchLabel,
  participants,
  selectedPlayerIds,
}: {
  matchLabel: string;
  participants: { playerId: string; playerName: string }[];
  selectedPlayerIds: Set<string>;
}) {
  return (
    <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">{matchLabel}</p>
      <div className="mt-3 space-y-1.5">
        {participants.map((p) => {
          const picked = selectedPlayerIds.has(p.playerId);
          return (
            <div key={p.playerId} className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-900">{p.playerName}</span>
              {picked ? (
                <span className="flex items-center gap-1 text-fairway-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Picked
                </span>
              ) : (
                <span className="flex items-center gap-1 text-ink-700/40">
                  <Circle className="h-3.5 w-3.5" />
                  Pending
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-ink-700/50">
        Each player picks through their own personal link. The admin runs the random draw once everyone&apos;s in.
      </p>
    </div>
  );
}
