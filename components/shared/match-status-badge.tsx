import { MATCH_STATUS_LABELS, MATCH_STATUS_STYLES, type MatchStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MatchStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = status as MatchStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        MATCH_STATUS_STYLES[s] ?? "bg-stone-200 text-stone-700",
        className,
      )}
    >
      {MATCH_STATUS_LABELS[s] ?? status}
    </span>
  );
}
