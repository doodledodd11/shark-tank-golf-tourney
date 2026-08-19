"use client";

import { useState } from "react";
import { MatchDetailCard } from "./match-detail-card";
import type { MatchWithDetails } from "@/lib/data";

/** Owns the "which match is open" state for one round's match list, so
 * opening one card closes whichever other one was open — RoundSection
 * itself stays a server component, this is just the interactive slice. */
export function RoundMatchesList({ matches }: { matches: MatchWithDetails[] }) {
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  return (
    <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {matches.map((match) => (
        <MatchDetailCard
          key={match.id}
          match={match}
          expanded={openMatchId === match.id}
          onToggle={() => setOpenMatchId(openMatchId === match.id ? null : match.id)}
        />
      ))}
    </div>
  );
}
