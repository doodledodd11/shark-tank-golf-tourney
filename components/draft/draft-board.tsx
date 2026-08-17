"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Crown, PartyPopper, Radio, Users } from "lucide-react";
import { getDraftBoard, submitDraftPick } from "@/lib/actions/draft";
import type { DraftBoardData } from "@/lib/draft";
import { cn } from "@/lib/utils";

const POLL_MS = 3000;
const TIER_LABELS: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3", 4: "Tier 4" };

export function DraftBoard({
  roundId,
  captainToken,
  initialData,
}: {
  roundId: string;
  captainToken?: string | null;
  initialData: DraftBoardData;
}) {
  const [data, setData] = useState(initialData);
  const [pickError, setPickError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(async () => {
      const fresh = await getDraftBoard(roundId, captainToken);
      if (fresh && mountedRef.current) setData(fresh);
    }, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [roundId, captainToken]);

  function handlePick(playerId: string) {
    if (!captainToken) return;
    setPickError(null);
    startTransition(async () => {
      const result = await submitDraftPick({ roundId, captainToken, playerId });
      if (result.error) {
        setPickError(result.error);
        return;
      }
      const fresh = await getDraftBoard(roundId, captainToken);
      if (fresh && mountedRef.current) setData(fresh);
    });
  }

  const myTurn = Boolean(data.myTeamId) && data.myTeamId === data.onTheClockTeamId && !data.isComplete;
  const currentTierPool = data.currentTier ? data.undraftedPlayers.filter((p) => p.tier === data.currentTier) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 text-center shadow-sm">
        {data.isComplete ? (
          <div className="flex flex-col items-center gap-1.5">
            <PartyPopper className="h-6 w-6 text-gold-600" />
            <p className="font-display text-xl font-bold text-fairway-900">Draft Complete</p>
            <p className="text-sm text-ink-700/60">Both rosters are set. Check the round for twosomes next.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fairway-600">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live, {TIER_LABELS[data.currentTier ?? 1]}
            </p>
            <p className="font-display text-2xl font-bold text-fairway-900">
              {data.teams.find((t) => t.id === data.onTheClockTeamId)?.name ?? "—"} is on the clock
            </p>
            {captainToken && (
              <p className="text-sm text-ink-700/60">
                {myTurn ? "It's your pick. Choose below." : "Waiting for the other captain to pick…"}
              </p>
            )}
          </div>
        )}
      </div>

      {myTurn && (
        <div className="rounded-2xl border border-gold-400/60 bg-gold-50/50 p-5">
          <p className="font-semibold text-fairway-900">
            Your Pick, {TIER_LABELS[data.currentTier ?? 1]} ({currentTierPool.length} available)
          </p>
          {pickError && <p className="mt-2 text-sm font-medium text-red-600">{pickError}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {currentTierPool.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={pending}
                onClick={() => handlePick(player.id)}
                className="rounded-lg border border-fairway-900/10 bg-white px-3 py-2 text-left text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:border-fairway-600 hover:bg-fairway-50 disabled:opacity-50"
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.teams.map((team) => (
          <TeamColumn key={team.id} team={team} isOnTheClock={team.id === data.onTheClockTeamId && !data.isComplete} />
        ))}
      </div>
    </div>
  );
}

function TeamColumn({
  team,
  isOnTheClock,
}: {
  team: DraftBoardData["teams"][number];
  isOnTheClock: boolean;
}) {
  const byTier: Record<number, DraftBoardData["teams"][number]["roster"]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const p of team.roster) byTier[p.tier]?.push(p);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm transition-colors",
        isOnTheClock ? "border-gold-400 ring-2 ring-gold-400/40" : "border-fairway-900/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-display text-lg font-bold text-ink-950">
          <Users className="h-4 w-4 text-fairway-500" />
          {team.name}
        </p>
        <span className="text-xs font-semibold text-ink-700/50">{team.roster.length} drafted</span>
      </div>
      {team.captainName && (
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-700/60">
          <Crown className="h-3.5 w-3.5 text-gold-600" />
          {team.captainName}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {[1, 2, 3, 4].map((tier) => (
          <div key={tier}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-700/40">{TIER_LABELS[tier]}</p>
            {byTier[tier]!.length === 0 ? (
              <p className="text-xs text-ink-700/30">—</p>
            ) : (
              <p className="text-sm text-ink-800">{byTier[tier]!.map((p) => p.name).join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
