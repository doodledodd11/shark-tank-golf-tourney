"use client";

import { useMemo, useState, useTransition } from "react";
import type { Player } from "@prisma/client";
import { Crown, Users } from "lucide-react";
import type { TeamWithRoster } from "@/lib/data";
import { initializeRoundTeams, setRoundRosters, updateTeam } from "@/lib/actions/rounds";
import { cn } from "@/lib/utils";

type Side = "A" | "B" | null;

export function RoundRosterTool({
  roundId,
  teams,
  eligiblePlayers,
}: {
  roundId: string;
  teams: TeamWithRoster[];
  eligiblePlayers: Player[];
}) {
  const [pending, startTransition] = useTransition();

  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-fairway-400/50 bg-fairway-50/40 p-8 text-center">
        <Users className="mx-auto h-7 w-7 text-fairway-500" />
        <p className="mt-2 font-display text-lg font-semibold text-fairway-900">No teams yet</p>
        <p className="mt-1 text-sm text-ink-700/60">Start the draft to create Team A and Team B for this round.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => initializeRoundTeams(roundId))}
          className="mt-4 rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-fairway-700"
        >
          Start Draft
        </button>
      </div>
    );
  }

  const [teamA, teamB] = teams;
  return (
    <div className="space-y-6">
      <RosterAssignmentGrid teamA={teamA!} teamB={teamB!} eligiblePlayers={eligiblePlayers} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TeamSettingsCard team={teamA!} />
        <TeamSettingsCard team={teamB!} />
      </div>
    </div>
  );
}

function RosterAssignmentGrid({
  teamA,
  teamB,
  eligiblePlayers,
}: {
  teamA: TeamWithRoster;
  teamB: TeamWithRoster;
  eligiblePlayers: Player[];
}) {
  const initialAssignments = useMemo(() => {
    const map = new Map<string, Side>();
    for (const p of eligiblePlayers) map.set(p.id, null);
    for (const m of teamA.memberships) map.set(m.playerId, "A");
    for (const m of teamB.memberships) map.set(m.playerId, "B");
    return map;
  }, [teamA, teamB, eligiblePlayers]);

  const [assignments, setAssignments] = useState(initialAssignments);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const byTier = useMemo(() => {
    const grouped: Record<number, Player[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const p of eligiblePlayers) grouped[p.tier]?.push(p);
    return grouped;
  }, [eligiblePlayers]);

  const tally = useMemo(() => {
    const t: Record<number, { a: number; b: number }> = { 1: { a: 0, b: 0 }, 2: { a: 0, b: 0 }, 3: { a: 0, b: 0 }, 4: { a: 0, b: 0 } };
    for (const p of eligiblePlayers) {
      const side = assignments.get(p.id);
      if (side === "A") t[p.tier]!.a++;
      if (side === "B") t[p.tier]!.b++;
    }
    return t;
  }, [assignments, eligiblePlayers]);

  function setSide(playerId: string, side: Side) {
    setAssignments((prev) => new Map(prev).set(playerId, side));
  }

  function handleSave() {
    setMessage(null);
    const teamAPlayerIds = eligiblePlayers.filter((p) => assignments.get(p.id) === "A").map((p) => p.id);
    const teamBPlayerIds = eligiblePlayers.filter((p) => assignments.get(p.id) === "B").map((p) => p.id);
    startTransition(async () => {
      const result = await setRoundRosters({ teamAId: teamA.id, teamBId: teamB.id, teamAPlayerIds, teamBPlayerIds });
      setMessage(result.error ?? "Rosters saved.");
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-ink-950">Roster Assignment</p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-ink-700/60">
          {[1, 2, 3, 4].map((tier) => (
            <span key={tier} className={cn(tally[tier]!.a !== tally[tier]!.b && "text-amber-600")}>
              Tier {tier}: {tally[tier]!.a} / {tally[tier]!.b}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {[1, 2, 3, 4].map((tier) => (
          <div key={tier}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">Tier {tier}</p>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {byTier[tier]?.map((player) => {
                const side = assignments.get(player.id) ?? null;
                return (
                  <div key={player.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 px-2.5 py-1.5">
                    <span className="truncate text-sm text-ink-900">{player.name}</span>
                    <div className="flex shrink-0 gap-1">
                      {(["A", "B"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSide(player.id, side === s ? null : s)}
                          className={cn(
                            "rounded px-2 py-0.5 text-xs font-bold",
                            side === s ? "bg-fairway-800 text-cream-50" : "bg-stone-100 text-stone-500 hover:bg-stone-200",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4 border-t border-stone-100 pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="rounded-lg bg-fairway-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-fairway-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Rosters"}
        </button>
        {message && <p className="text-sm text-ink-700/60">{message}</p>}
      </div>
    </div>
  );
}

function TeamSettingsCard({ team }: { team: TeamWithRoster }) {
  const [pending, startTransition] = useTransition();
  const [captainId, setCaptainId] = useState(team.captainId ?? "");
  const [name, setName] = useState(team.name);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <label className="block text-xs font-medium text-ink-700/60">Team Name</label>
      <input
        value={name}
        disabled={pending}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== team.name) startTransition(() => updateTeam(team.id, { name: name.trim() }));
        }}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold"
      />

      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-700/60">
        <Crown className="h-3.5 w-3.5 text-gold-600" />
        Captain
      </p>
      <select
        value={captainId}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value;
          setCaptainId(value);
          startTransition(() => updateTeam(team.id, { captainId: value || null }));
        }}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
      >
        <option value="">No captain set</option>
        {team.memberships.map((m) => (
          <option key={m.playerId} value={m.playerId}>
            {m.player.name}
          </option>
        ))}
      </select>
    </div>
  );
}
