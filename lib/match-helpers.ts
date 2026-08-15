import type { MatchWithDetails } from "@/lib/data";

export function getSideNames(match: MatchWithDetails, side: "A" | "B"): string {
  const names = getSidePlayers(match, side).map((p) => p.name);
  return names.length > 0 ? names.join(" + ") : "TBD";
}

export function getSidePlayers(match: MatchWithDetails, side: "A" | "B") {
  return match.participants.filter((p) => p.side === side).map((p) => p.player);
}
