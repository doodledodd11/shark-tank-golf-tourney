"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PartyPopper, Radio, Swords, User } from "lucide-react";
import { getSinglesMatchmakingBoard, announceSingles, respondToSingles } from "@/lib/actions/matchmaking";
import type { SinglesMatchmakingBoardData } from "@/lib/matchmaking";
import { cn } from "@/lib/utils";

const POLL_MS = 3000;

export function SinglesMatchmakingBoard({
  roundId,
  captainToken,
  initialData,
}: {
  roundId: string;
  captainToken?: string | null;
  initialData: SinglesMatchmakingBoardData;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(async () => {
      const fresh = await getSinglesMatchmakingBoard(roundId, captainToken);
      if (fresh && mountedRef.current) setData(fresh);
    }, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [roundId, captainToken]);

  async function refresh() {
    const fresh = await getSinglesMatchmakingBoard(roundId, captainToken);
    if (fresh && mountedRef.current) setData(fresh);
  }

  function handleAnnounce(playerId: string) {
    if (!captainToken) return;
    setError(null);
    startTransition(async () => {
      const result = await announceSingles({ roundId, captainToken, playerId });
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  function handleRespond(playerId: string) {
    if (!captainToken) return;
    setError(null);
    startTransition(async () => {
      const result = await respondToSingles({ roundId, captainToken, playerId });
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  const myTurn = Boolean(data.myTeamId) && data.myTeamId === data.onTheClockTeamId && !data.isComplete;
  const onTheClockTeam = data.teams.find((t) => t.id === data.onTheClockTeamId);
  const announcedPlayer = data.players.find((p) => p.id === data.announcedPlayerId);
  const announcerTeam = announcedPlayer ? data.teams.find((t) => t.id === announcedPlayer.teamId) : null;

  const myAvailable = data.myTeamId ? data.players.filter((p) => p.teamId === data.myTeamId && !p.opponentPlayerId && !p.announced) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 text-center shadow-sm">
        {data.isComplete ? (
          <div className="flex flex-col items-center gap-1.5">
            <PartyPopper className="h-6 w-6 text-gold-600" />
            <p className="font-display text-xl font-bold text-fairway-900">Singles Matchmaking Complete</p>
            <p className="text-sm text-ink-700/60">Every player has an opponent. Check the round for the matchups.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fairway-600">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live Singles Matchmaking
            </p>
            {data.phase === "RESPOND" && announcedPlayer ? (
              <>
                <p className="font-display text-xl font-bold text-fairway-900">
                  {announcerTeam?.name} announced {announcedPlayer.name}
                </p>
                <p className="text-sm text-ink-700/60">{onTheClockTeam?.name} is choosing who faces them.</p>
              </>
            ) : (
              <p className="font-display text-xl font-bold text-fairway-900">{onTheClockTeam?.name} is announcing a player</p>
            )}
            {captainToken && <p className="text-sm text-ink-700/60">{myTurn ? "It's your move." : "Waiting on the other captain…"}</p>}
          </div>
        )}
      </div>

      {myTurn && (
        <div className="rounded-2xl border border-gold-400/60 bg-gold-50/50 p-5">
          <p className="flex items-center gap-1.5 font-semibold text-fairway-900">
            <Swords className="h-4 w-4" />
            {data.phase === "ANNOUNCE" ? "Announce a Player" : "Choose Your Opponent"}
          </p>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {myAvailable.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                onClick={() => (data.phase === "ANNOUNCE" ? handleAnnounce(p.id) : handleRespond(p.id))}
                className="rounded-lg border border-fairway-900/10 bg-white px-3 py-2 text-left text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:border-fairway-600 hover:bg-fairway-50 disabled:opacity-50"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.teams.map((team) => (
          <TeamPlayersColumn
            key={team.id}
            teamName={team.name}
            players={data.players.filter((p) => p.teamId === team.id)}
            allPlayers={data.players}
            isOnTheClock={team.id === data.onTheClockTeamId && !data.isComplete}
          />
        ))}
      </div>
    </div>
  );
}

function TeamPlayersColumn({
  teamName,
  players,
  allPlayers,
  isOnTheClock,
}: {
  teamName: string;
  players: SinglesMatchmakingBoardData["players"];
  allPlayers: SinglesMatchmakingBoardData["players"];
  isOnTheClock: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm transition-colors",
        isOnTheClock ? "border-gold-400 ring-2 ring-gold-400/40" : "border-fairway-900/10",
      )}
    >
      <p className="flex items-center gap-1.5 font-display text-lg font-bold text-ink-950">
        <User className="h-4 w-4 text-fairway-500" />
        {teamName}
      </p>
      <div className="mt-3 space-y-1.5">
        {players.map((p) => {
          const opponent = p.opponentPlayerId ? allPlayers.find((o) => o.id === p.opponentPlayerId) : null;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                p.announced
                  ? "border-gold-400 bg-gold-50 font-semibold text-fairway-900"
                  : opponent
                    ? "border-fairway-900/10 bg-fairway-50 text-ink-700"
                    : "border-fairway-900/10 text-ink-900",
              )}
            >
              <p className="font-semibold text-ink-900">{p.name}</p>
              {p.announced && <p className="text-xs text-gold-700">Announced, awaiting a response</p>}
              {opponent && <p className="text-xs text-ink-700/50">vs {opponent.name}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
