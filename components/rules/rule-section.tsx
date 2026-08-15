export function RuleSection({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-fairway-900/10 py-10 first:pt-0 last:border-0">
      <h2 className="flex items-baseline gap-3 font-display text-2xl font-bold text-fairway-900 sm:text-3xl">
        <span className="text-base font-semibold text-gold-600">{String(number).padStart(2, "0")}</span>
        {title}
      </h2>
      <div className="prose-golf mt-4 space-y-4 text-ink-700/80">{children}</div>
    </section>
  );
}
