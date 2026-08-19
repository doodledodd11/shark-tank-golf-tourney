"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Handshake, PartyPopper, Radio, Swords } from "lucide-react";
import { getMatchmakingBoard, announcePairing, respondToPairing } from "@/lib/actions/matchmaking";
import type { MatchmakingBoardData } from "@/lib/matchmaking";
import { cn } from "@/lib/utils";

const POLL_MS = 3000;

export function MatchmakingBoard({
  roundId,
  captainToken,
  initialData,
}: {
  roundId: string;
  captainToken?: string | null;
  initialData: MatchmakingBoardData;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(async () => {
      const fresh = await getMatchmakingBoard(roundId, captainToken);
      if (fresh && mountedRef.current) setData(fresh);
    }, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [roundId, captainToken]);

  async function refresh() {
    const fresh = await getMatchmakingBoard(roundId, captainToken);
    if (fresh && mountedRef.current) setData(fresh);
  }

  function handleAnnounce(pairingId: string) {
    if (!captainToken) return;
    setError(null);
    startTransition(async () => {
      const result = await announcePairing({ roundId, captainToken, pairingId });
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  function handleRespond(pairingId: string) {
    if (!captainToken) return;
    setError(null);
    startTransition(async () => {
      const result = await respondToPairing({ roundId, captainToken, pairingId });
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  const myTurn = Boolean(data.myTeamId) && data.myTeamId === data.onTheClockTeamId && !data.isComplete;
  const onTheClockTeam = data.teams.find((t) => t.id === data.onTheClockTeamId);
  const announcedPairing = data.pairings.find((p) => p.id === data.announcedPairingId);
  const announcerTeam = announcedPairing ? data.teams.find((t) => t.id === announcedPairing.teamId) : null;

  const myUnmatched = data.myTeamId
    ? data.pairings.filter((p) => p.teamId === data.myTeamId && !p.opponentPairingId && !p.announced)
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 text-center shadow-sm">
        {data.isComplete ? (
          <div className="flex flex-col items-center gap-1.5">
            <PartyPopper className="h-6 w-6 text-gold-600" />
            <p className="font-display text-xl font-bold text-fairway-900">Matchmaking Complete</p>
            <p className="text-sm text-ink-700/60">Every twosome has an opponent. Check the round for the matchups.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fairway-600">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live Matchmaking
            </p>
            {data.phase === "RESPOND" && announcedPairing ? (
              <>
                <p className="font-display text-xl font-bold text-fairway-900">
                  {announcerTeam?.name} announced {announcedPairing.player1Name} (T{announcedPairing.player1Tier}) +{" "}
                  {announcedPairing.player2Name} (T{announcedPairing.player2Tier})
                </p>
                <p className="text-sm text-ink-700/60">{onTheClockTeam?.name} is choosing a twosome to face them.</p>
              </>
            ) : (
              <p className="font-display text-xl font-bold text-fairway-900">{onTheClockTeam?.name} is announcing a twosome</p>
            )}
            {captainToken && (
              <p className="text-sm text-ink-700/60">
                {myTurn ? "It's your move." : "Waiting on the other captain…"}
              </p>
            )}
          </div>
        )}
      </div>

      {myTurn && (
        <div className="rounded-2xl border border-gold-400/60 bg-gold-50/50 p-5">
          <p className="flex items-center gap-1.5 font-semibold text-fairway-900">
            <Swords className="h-4 w-4" />
            {data.phase === "ANNOUNCE" ? "Announce a Twosome" : "Choose Your Opponent"}
          </p>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myUnmatched.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                onClick={() => (data.phase === "ANNOUNCE" ? handleAnnounce(p.id) : handleRespond(p.id))}
                className="rounded-lg border border-fairway-900/10 bg-white px-3 py-2 text-left text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:border-fairway-600 hover:bg-fairway-50 disabled:opacity-50"
              >
                {p.player1Name} (T{p.player1Tier}) + {p.player2Name} (T{p.player2Tier})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.teams.map((team) => (
          <TeamPairingsColumn
            key={team.id}
            teamName={team.name}
            pairings={data.pairings.filter((p) => p.teamId === team.id)}
            allPairings={data.pairings}
            isOnTheClock={team.id === data.onTheClockTeamId && !data.isComplete}
          />
        ))}
      </div>
    </div>
  );
}

function TeamPairingsColumn({
  teamName,
  pairings,
  allPairings,
  isOnTheClock,
}: {
  teamName: string;
  pairings: MatchmakingBoardData["pairings"];
  allPairings: MatchmakingBoardData["pairings"];
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
        <Handshake className="h-4 w-4 text-fairway-500" />
        {teamName}
      </p>
      <div className="mt-3 space-y-1.5">
        {pairings.map((p) => {
          const opponent = p.opponentPairingId ? allPairings.find((o) => o.id === p.opponentPairingId) : null;
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
              <p className="font-semibold text-ink-900">
                {p.player1Name} (T{p.player1Tier}) + {p.player2Name} (T{p.player2Tier})
              </p>
              {p.announced && <p className="text-xs text-gold-700">Announced, awaiting a response</p>}
              {opponent && (
                <p className="text-xs text-ink-700/50">
                  vs {opponent.player1Name} (T{opponent.player1Tier}) + {opponent.player2Name} (T{opponent.player2Tier})
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
