import { Check } from "lucide-react";
import {
  TOURNAMENT_STATUSES,
  TOURNAMENT_STATUS_DESCRIPTIONS,
  TOURNAMENT_STATUS_LABELS,
  type TournamentStatus,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusSection({ status }: { status: TournamentStatus }) {
  const activeIndex = TOURNAMENT_STATUSES.indexOf(status);

  return (
    <section className="bg-fairway-50 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fairway-600">Tournament Status</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-fairway-900 sm:text-4xl">
            {TOURNAMENT_STATUS_LABELS[status]}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-700/70">{TOURNAMENT_STATUS_DESCRIPTIONS[status]}</p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {TOURNAMENT_STATUSES.map((s, i) => {
            const state = i < activeIndex ? "done" : i === activeIndex ? "current" : "upcoming";
            return (
              <div
                key={s}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  state === "done" && "border-fairway-300 bg-fairway-100 text-fairway-700",
                  state === "current" && "border-gold-500 bg-gold-500 text-fairway-950",
                  state === "upcoming" && "border-fairway-900/10 bg-white text-ink-700/40",
                )}
              >
                {state === "done" && <Check className="h-3 w-3" />}
                {TOURNAMENT_STATUS_LABELS[s]}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
