import { getActiveTournament, getAllPlayers, getRoundsWithDetails } from "@/lib/data";
import { buildAssignmentMap } from "@/lib/player-status";
import { AddPlayerForm } from "@/components/admin/add-player-form";
import { PlayerRow } from "@/components/admin/player-row";

export const metadata = { title: "Players" };

export default async function AdminPlayersPage() {
  const tournament = await getActiveTournament();
  const [players, rounds] = await Promise.all([getAllPlayers(tournament.id), getRoundsWithDetails(tournament.id)]);
  const assignments = buildAssignmentMap(rounds, players);
  const canDelete = tournament.status === "REGISTRATION";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Players</h1>
      <p className="mt-1 text-sm text-ink-700/60">
        {players.length} players registered.
        {!canDelete && " Removal is disabled once the tournament has moved past Registration."}
      </p>

      <div className="mt-6">
        <AddPlayerForm tournamentId={tournament.id} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="min-w-[1020px]">
          <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-2 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-700/50">
            <span className="col-span-3">Name</span>
            <span className="col-span-1">Tier</span>
            <span className="col-span-2">Team</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1">Elim. Rnd</span>
            <span className="col-span-2">Hometown</span>
            <span className="col-span-1">HCP</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              canDelete={canDelete}
              assignment={assignments.get(player.id) ?? null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
