export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="border-b border-gold-700/20 bg-fairway-950 fairway-texture px-4 py-14 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-cream-50 sm:text-5xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-cream-100/70">{subtitle}</p>}
    </section>
  );
}
