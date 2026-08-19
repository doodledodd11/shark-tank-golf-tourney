"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Handshake, Trash2, Users2 } from "lucide-react";
import { getTwosomeLockBoard, lockTwosome, deleteTwosome } from "@/lib/actions/matchmaking";
import type { TwosomeLockBoardData } from "@/lib/matchmaking";

const POLL_MS = 3000;

export function TwosomeLockBoard({
  roundId,
  captainToken,
  initialData,
}: {
  roundId: string;
  captainToken: string;
  initialData: TwosomeLockBoardData;
}) {
  const [data, setData] = useState(initialData);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const interval = setInterval(async () => {
      const fresh = await getTwosomeLockBoard(roundId, captainToken);
      if (fresh && mountedRef.current) setData(fresh);
    }, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [roundId, captainToken]);

  async function refresh() {
    const fresh = await getTwosomeLockBoard(roundId, captainToken);
    if (fresh && mountedRef.current) setData(fresh);
  }

  function handleLock() {
    if (!player1Id || !player2Id) return;
    setError(null);
    startTransition(async () => {
      const result = await lockTwosome({ roundId, captainToken, player1Id, player2Id });
      if (result.error) {
        setError(result.error);
        return;
      }
      setPlayer1Id("");
      setPlayer2Id("");
      await refresh();
    });
  }

  function handleDelete(pairingId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTwosome({ roundId, captainToken, pairingId });
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  const unpaired = data.roster.filter((p) => !data.pairedPlayerIds.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 text-center shadow-sm">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fairway-600">
          <Handshake className="h-3.5 w-3.5" />
          {data.myTeamName}&apos;s Twosomes
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-fairway-900">
          {data.pairings.length} of {data.requiredPairings} locked
        </p>
        <p className="mt-1 text-sm text-ink-700/60">
          Build these privately — the other captain can&apos;t see your groupings, only that{" "}
          {data.otherTeamLockedCount} of {data.otherTeamRequired} of theirs are locked so far.
        </p>
      </div>

      {data.isComplete ? (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-gold-400/60 bg-gold-50/50 p-5 text-center">
          <Users2 className="h-6 w-6 text-gold-600" />
          <p className="font-display text-xl font-bold text-fairway-900">Your Twosomes Are Set</p>
          <p className="text-sm text-ink-700/60">
            Once the other team locks theirs too, live matchmaking opens up to set the actual matchups.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gold-400/60 bg-gold-50/50 p-5">
          <p className="font-semibold text-fairway-900">Lock a Twosome</p>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-fairway-500 focus:outline-none"
            >
              <option value="">Player 1</option>
              {unpaired.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                  {p.name} (Tier {p.tier})
                </option>
              ))}
            </select>
            <select
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-fairway-500 focus:outline-none"
            >
              <option value="">Player 2</option>
              {unpaired.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                  {p.name} (Tier {p.tier})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !player1Id || !player2Id}
              onClick={handleLock}
              className="rounded-lg bg-fairway-900 px-4 py-2 text-sm font-bold text-cream-50 hover:bg-fairway-800 disabled:opacity-50"
            >
              Lock Twosome
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-fairway-900/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-700/40">Locked Twosomes</p>
        {data.pairings.length === 0 ? (
          <p className="mt-2 text-sm text-ink-700/40">None yet.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {data.pairings.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-fairway-900/10 px-3 py-2"
              >
                <span className="text-sm font-semibold text-ink-900">
                  {p.player1.name} (T{p.player1.tier}) + {p.player2.name} (T{p.player2.tier})
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Undo ${p.player1.name} + ${p.player2.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
