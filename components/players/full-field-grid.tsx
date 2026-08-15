import type { Player } from "@prisma/client";
import type { CurrentAssignment } from "@/lib/player-status";
import { PlayerCard } from "./player-card";

export function FullFieldGrid({
  players,
  assignments,
}: {
  players: Player[];
  assignments: Map<string, CurrentAssignment | null>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {players.map((player) => (
        <PlayerCard key={player.id} player={player} assignment={assignments.get(player.id) ?? null} />
      ))}
    </div>
  );
}
