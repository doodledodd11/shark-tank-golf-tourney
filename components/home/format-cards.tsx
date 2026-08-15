import { FORMAT_INFO } from "@/lib/formats";

const HOMEPAGE_FORMAT_IDS = ["SCRAMBLE", "SHAMBLE", "BEST_BALL", "ALTERNATE_SHOT", "SINGLES"] as const;

export function FormatCards() {
  return (
    <section className="bg-cream-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fairway-600">Match Formats</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-fairway-900 sm:text-4xl">
            Five Ways to Win a Point
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOMEPAGE_FORMAT_IDS.map((id) => {
            const format = FORMAT_INFO[id];
            return (
              <div
                key={id}
                className="flex flex-col rounded-2xl border border-fairway-900/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="font-display text-xl font-bold text-fairway-900">{format.label}</p>
                <p className="mt-1 text-sm font-medium text-gold-600">{format.tagline}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-700/70">{format.description}</p>
                <p className="mt-4 inline-flex w-fit items-center rounded-full bg-fairway-50 px-3 py-1 text-xs font-semibold text-fairway-700">
                  {format.usedIn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
