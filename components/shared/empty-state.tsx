import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-fairway-900/15 bg-fairway-50/40 px-6 py-16 text-center">
      <Icon className="h-8 w-8 text-fairway-400" />
      <p className="mt-3 font-display text-xl font-semibold text-fairway-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-700/60">{body}</p>
    </div>
  );
}
