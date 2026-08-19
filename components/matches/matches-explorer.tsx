"use client";

import { useMemo, useState } from "react";
import { MATCH_STATUSES, MATCH_STATUS_LABELS, type MatchStatus } from "@/lib/constants";
import type { MatchWithDetails } from "@/lib/data";
import { MatchDetailCard } from "@/components/players/match-detail-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchX } from "lucide-react";

export interface FlatMatch extends MatchWithDetails {
  roundName: string;
  roundNumber: number;
}

const ALL = "ALL";

export function MatchesExplorer({
  matches,
  roundOptions,
  teamOptions,
  playerOptions,
}: {
  matches: FlatMatch[];
  roundOptions: { value: string; label: string }[];
  teamOptions: { value: string; label: string }[];
  playerOptions: { value: string; label: string }[];
}) {
  const [round, setRound] = useState(ALL);
  const [team, setTeam] = useState(ALL);
  const [player, setPlayer] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (round !== ALL && String(m.roundNumber) !== round) return false;
      if (team !== ALL && m.teamAId !== team && m.teamBId !== team) return false;
      if (player !== ALL && !m.participants.some((p) => p.playerId === player)) return false;
      if (status !== ALL && m.status !== status) return false;
      return true;
    });
  }, [matches, round, team, player, status]);

  const inProgress = filtered.filter((m) => m.status === "IN_PROGRESS");
  const upcoming = filtered.filter((m) =>
    ["PAIRING_PENDING", "COURSE_SELECTION", "SCHEDULED"].includes(m.status),
  );
  const completed = filtered.filter((m) => m.status === "COMPLETE");

  const hasFilters = round !== ALL || team !== ALL || player !== ALL || status !== ALL;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FilterSelect label="Round" value={round} onChange={setRound} options={roundOptions} />
        <FilterSelect label="Team" value={team} onChange={setTeam} options={teamOptions} />
        <FilterSelect label="Player" value={player} onChange={setPlayer} options={playerOptions} />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={MATCH_STATUSES.map((s) => ({ value: s, label: MATCH_STATUS_LABELS[s as MatchStatus] }))}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={SearchX} title="No matches found" body="Try adjusting or clearing your filters." />
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <MatchGroup title="In Progress" matches={inProgress} />
          <MatchGroup title="Upcoming" matches={upcoming} />
          <MatchGroup title="Completed" matches={completed} />
        </div>
      )}

      {hasFilters && (
        <p className="mt-6 text-center text-sm text-ink-700/40">
          Showing {filtered.length} of {matches.length} matches
        </p>
      )}
    </div>
  );
}

function MatchGroup({ title, matches }: { title: string; matches: FlatMatch[] }) {
  if (matches.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-fairway-900">
        {title} <span className="text-base font-normal text-ink-700/40">({matches.length})</span>
      </h2>
      {/* items-start: without it, a grid row stretches every card to match
          its tallest sibling, so an expanded card leaves its collapsed
          neighbors visually tall and empty (same bug the course cards had). */}
      <div className="mt-4 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {matches.map((match) => (
          <MatchDetailCard key={match.id} match={match} roundLabel={match.roundName} />
        ))}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-700/40">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
