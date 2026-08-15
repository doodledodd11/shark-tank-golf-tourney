import { Check } from "lucide-react";
import { PROGRESSION_STAGES, getProgressionStageIndex, type TournamentStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STAGE_CAPTIONS = ["The Full Field", "Round 1 Survivors", "Round 2 Survivors", "Championship", "Champions"];
// Short glyphs for inside the circles — "Final 8" and "4 Champions" are too
// long to wrap cleanly in a small circle, so the circle shows just the
// player count and the full label sits below as a caption instead.
const CIRCLE_GLYPHS = ["32", "16", "8", "8", "4"];

export function Progression({ status }: { status: TournamentStatus }) {
  const activeIndex = getProgressionStageIndex(status);

  return (
    <section className="border-t border-cream-50/10 bg-fairway-950 fairway-texture pb-16 pt-4 sm:pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-center font-display text-2xl font-semibold text-cream-50 sm:text-3xl">
          The Road to Four Champions
        </h2>

        {/* Desktop / tablet: horizontal ladder */}
        <div className="mt-12 hidden md:block">
          <div className="relative flex items-start justify-between">
            <div className="absolute left-0 right-0 top-7 h-px bg-cream-50/15" />
            {PROGRESSION_STAGES.map((stage, i) => {
              const state = i < activeIndex ? "done" : i === activeIndex ? "current" : "upcoming";
              return (
                <div key={stage} className="relative z-10 flex w-full flex-col items-center px-2 text-center">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border-2 font-display text-lg font-bold transition-colors",
                      state === "done" && "border-gold-500 bg-gold-500 text-fairway-950",
                      state === "current" &&
                        "border-gold-400 bg-fairway-950 text-gold-400 shadow-[0_0_0_6px_rgba(201,162,39,0.15)]",
                      state === "upcoming" && "border-cream-50/20 bg-fairway-950 text-cream-100/40",
                    )}
                  >
                    {state === "done" ? <Check className="h-6 w-6" /> : CIRCLE_GLYPHS[i]}
                  </div>
                  <p className={cn("mt-3 text-sm font-semibold", state === "upcoming" ? "text-cream-100/40" : "text-cream-50")}>
                    {stage}
                  </p>
                  <p className="mt-0.5 text-xs text-cream-100/40">{STAGE_CAPTIONS[i]}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: vertical ladder */}
        <div className="mt-10 md:hidden">
          {PROGRESSION_STAGES.map((stage, i) => {
            const state = i < activeIndex ? "done" : i === activeIndex ? "current" : "upcoming";
            const isLast = i === PROGRESSION_STAGES.length - 1;
            return (
              <div key={stage} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-bold",
                      state === "done" && "border-gold-500 bg-gold-500 text-fairway-950",
                      state === "current" &&
                        "border-gold-400 bg-fairway-950 text-gold-400 shadow-[0_0_0_5px_rgba(201,162,39,0.15)]",
                      state === "upcoming" && "border-cream-50/20 bg-fairway-950 text-cream-100/40",
                    )}
                  >
                    {state === "done" ? <Check className="h-5 w-5" /> : CIRCLE_GLYPHS[i]}
                  </div>
                  {!isLast && <div className="my-1 h-8 w-px bg-cream-50/15" />}
                </div>
                <div className="pb-6">
                  <p className={cn("font-semibold", state === "upcoming" ? "text-cream-100/40" : "text-cream-50")}>{stage}</p>
                  <p className="text-sm text-cream-100/40">{STAGE_CAPTIONS[i]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
