import { HOW_IT_WORKS_STEPS } from "@/lib/rules-content";

export function HowItWorks() {
  return (
    <section className="bg-fairway-50 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-fairway-600">How It Works</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-fairway-900 sm:text-4xl">
            From 32 Golfers to 4 Champions
          </h2>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fairway-900 font-display text-sm font-bold text-gold-400">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-ink-950">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-700/70">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
