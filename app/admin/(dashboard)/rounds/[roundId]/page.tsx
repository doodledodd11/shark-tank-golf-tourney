import { notFound } from "next/navigation";
import { getActiveTournament, getAllPlayers, getRoundWithDetails } from "@/lib/data";
import { getEligiblePlayersForRound } from "@/lib/player-status";
import { getDraftBoardData } from "@/lib/draft";
import { computeTwosomeLockState, computeMatchmakingState, type MatchmakingTeam } from "@/lib/matchmaking-logic";
import { RoundSetupChoice } from "@/components/admin/round-setup-choice";
import { LiveDraftAdminPanel } from "@/components/admin/live-draft-admin-panel";
import { RoundRosterTool } from "@/components/admin/round-roster-tool";
import { RoundPairingsManager } from "@/components/admin/round-pairings-manager";
import { LiveTwosomeLockAdminPanel } from "@/components/admin/live-twosome-lock-panel";
import { RoundMatchCreator } from "@/components/admin/round-match-creator";
import { LiveMatchmakingAdminPanel } from "@/components/admin/live-matchmaking-panel";
import { RandomizeTeamMatchupsButton } from "@/components/admin/randomize-team-matchups-button";
import { PairSinglesBySeedButton } from "@/components/admin/pair-singles-by-seed-button";
import { SetFirstAnnouncerField } from "@/components/admin/set-first-announcer-field";
import { RoundMatchList } from "@/components/admin/round-match-list";
import { RoundCompletePanel } from "@/components/admin/round-complete-panel";
import { RoundDeadlineField } from "@/components/admin/round-deadline-field";
import { EnableCaptainLinksButton } from "@/components/admin/enable-captain-links-button";

export const metadata = { title: "Round Management" };

export default async function AdminRoundPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const round = await getRoundWithDetails(roundId);
  if (!round) notFound();

  const tournament = await getActiveTournament();
  const allPlayers = await getAllPlayers(tournament.id);
  const eligiblePlayers = getEligiblePlayersForRound(round, allPlayers);

  const hasCaptainTokens = round.teams.some((t) => t.captainAccessToken);

  const draftBoard = hasCaptainTokens ? await getDraftBoardData(round.id) : null;
  const draftInProgress = Boolean(draftBoard && !draftBoard.isComplete);

  const onTheClockTeam = draftBoard?.teams.find((t) => t.id === draftBoard.onTheClockTeamId);
  const totalDrafted = draftBoard?.teams.reduce((sum, t) => sum + t.roster.length, 0) ?? 0;
  const totalNeeded = draftBoard ? draftBoard.recommendedPicksPerTier * 4 * 2 : 0;
  const draftStatusLabel =
    draftBoard && !draftBoard.isComplete
      ? `${onTheClockTeam?.name ?? "?"}'s turn (${totalDrafted} of ${totalNeeded} drafted)`
      : "";

  const isChampionshipRound = round.number === 3;
  // Twosome locking applies everywhere pairings exist at all — Round 1/2's
  // full rosters and the championship's 4-player teams alike. Only Round
  // 1/2 use the live announce/respond ritual to turn those into matches,
  // though: the championship draws its two team matchups randomly instead
  // (see randomizeChampionshipTeamMatchupsLogic).
  const twosomeLockRoundApplies = round.number === 1 || round.number === 2 || isChampionshipRound;
  const livePairingMatchmakingApplies = round.number === 1 || round.number === 2;

  const twosomeLockState =
    twosomeLockRoundApplies && round.teams.length === 2
      ? computeTwosomeLockState(
          [{ id: round.teams[0]!.id }, { id: round.teams[1]!.id }],
          round.teams[0]!.memberships.length,
          round.pairings.reduce<Record<string, number>>((acc, p) => {
            if (p.locked) acc[p.teamId] = (acc[p.teamId] ?? 0) + 1;
            return acc;
          }, {}),
        )
      : null;
  const twosomeLockInProgress = Boolean(twosomeLockState && !twosomeLockState.isComplete && hasCaptainTokens);

  const matchmakingTeams: [MatchmakingTeam, MatchmakingTeam] | null =
    livePairingMatchmakingApplies && round.teams.length === 2
      ? [
          { id: round.teams[0]!.id, order: round.teams[0]!.order },
          { id: round.teams[1]!.id, order: round.teams[1]!.order },
        ]
      : null;
  const matchedPairingIds = new Set(round.matches.flatMap((m) => [m.pairingAId, m.pairingBId].filter((id): id is string => Boolean(id))));
  const unmatchedPairings = round.pairings.filter((p) => !matchedPairingIds.has(p.id));
  const matchmakingState =
    matchmakingTeams && twosomeLockState?.isComplete
      ? computeMatchmakingState(
          matchmakingTeams,
          unmatchedPairings.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
          round.matches.length,
          round.firstAnnouncerTeamId,
        )
      : null;
  const matchmakingInProgress = Boolean(matchmakingState && !matchmakingState.isComplete && hasCaptainTokens);
  const matchmakingOnTheClockTeam = round.teams.find((t) => t.id === matchmakingState?.onTheClockTeamId);
  const totalMatchesNeeded = round.teams[0] ? round.teams[0].memberships.length / 2 : 0;
  const matchmakingStatusLabel =
    matchmakingState && !matchmakingState.isComplete
      ? `${matchmakingOnTheClockTeam?.name ?? "?"} to ${matchmakingState.phase === "ANNOUNCE" ? "announce" : "respond"} (${round.matches.length} of ${totalMatchesNeeded} matched)`
      : "";

  // Championship-only: team matchups are drawn randomly once twosomes are
  // locked, then singles matches are paired by seed rank from there.
  const championshipTeamMatchesBuilt = round.matches.filter((m) => m.pairingAId && m.pairingBId).length;
  const championshipTeamPhaseDone = Boolean(twosomeLockState?.isComplete) && unmatchedPairings.length === 0 && championshipTeamMatchesBuilt > 0;
  const singlesRosterSize = round.teams[0]?.memberships.length ?? 0;
  const singlesMatchesBuilt = round.matches.filter((m) => !m.pairingAId && !m.pairingBId && !m.isPlayoff).length;
  const singlesPhaseDone = singlesMatchesBuilt >= singlesRosterSize && singlesRosterSize > 0;

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{round.name}</h1>
          <p className="mt-1 text-sm text-ink-700/60">
            {round.playersStart} players → {round.playersAdvance} advance · Status: {round.status}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoundDeadlineField roundId={round.id} deadline={round.deadline} />
        </div>
      </div>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink-700/50">1. Draft Teams</h2>
        {round.teams.length === 0 ? (
          <RoundSetupChoice roundId={round.id} eligiblePlayers={eligiblePlayers} />
        ) : draftInProgress ? (
          <LiveDraftAdminPanel roundId={round.id} roundName={round.name} teams={round.teams} statusLabel={draftStatusLabel} />
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-700/50">
              Also how to fix a mis-assigned player later. Toggle their side and save.
            </p>
            <RoundRosterTool roundId={round.id} teams={round.teams} eligiblePlayers={eligiblePlayers} />
          </>
        )}
      </section>

      {round.teams.length > 0 && !draftInProgress && (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">2. Twosomes</h2>
            {twosomeLockInProgress ? (
              <LiveTwosomeLockAdminPanel
                roundId={round.id}
                roundName={round.name}
                teams={round.teams.map((t) => ({
                  id: t.id,
                  name: t.name,
                  captainName: t.captain?.name ?? null,
                  captainAccessToken: t.captainAccessToken,
                  locked: round.pairings.filter((p) => p.teamId === t.id && p.locked).length,
                  required: twosomeLockState!.teams.find((ts) => ts.teamId === t.id)?.requiredPairings ?? 0,
                }))}
              />
            ) : (
              <>
                {twosomeLockRoundApplies && !hasCaptainTokens && round.pairings.length === 0 && (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-fairway-400/40 bg-fairway-50/40 p-3">
                    <p className="text-xs text-ink-700/60">Let captains build their twosomes live instead of doing it yourself.</p>
                    <EnableCaptainLinksButton roundId={round.id} label="Enable Live Twosome Locking" />
                  </div>
                )}
                <RoundPairingsManager round={round} teams={round.teams} />
              </>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">3. Matchups</h2>

            {isChampionshipRound ? (
              <div className="space-y-4">
                {!championshipTeamPhaseDone && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="mb-1 text-sm font-semibold text-ink-900">Team Matchups (2v2)</p>
                    {twosomeLockState?.isComplete ? (
                      <>
                        <p className="mb-3 text-xs text-ink-700/50">
                          Both teams&apos; twosomes are locked. Draw the two 2v2 matchups randomly.
                        </p>
                        <RandomizeTeamMatchupsButton roundId={round.id} />
                      </>
                    ) : (
                      <p className="text-xs text-ink-700/50">Waiting on both teams to lock their twosomes first (see above).</p>
                    )}
                  </div>
                )}

                {championshipTeamPhaseDone && !singlesPhaseDone && (
                  <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                    <p className="mb-1 text-sm font-semibold text-ink-900">Singles Matchups (1v1)</p>
                    <p className="mb-3 text-xs text-ink-700/50">
                      Pairs survivors by seed within their own team&apos;s roster — best vs best, 2nd-best vs
                      2nd-best, and so on.
                    </p>
                    <PairSinglesBySeedButton roundId={round.id} />
                  </div>
                )}

                {(!championshipTeamPhaseDone || !singlesPhaseDone) && (
                  <div className="mt-2">
                    <RoundMatchList matches={round.matches} />
                  </div>
                )}

                {championshipTeamPhaseDone && singlesPhaseDone && (
                  <>
                    <RoundMatchCreator round={round} teams={round.teams} />
                    <div className="mt-4">
                      <RoundMatchList matches={round.matches} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {livePairingMatchmakingApplies && twosomeLockState?.isComplete && !matchmakingState?.isComplete && (
                  <div className="mb-3 rounded-2xl border border-stone-200 bg-white p-3">
                    <SetFirstAnnouncerField
                      roundId={round.id}
                      teams={round.teams.map((t) => ({ id: t.id, name: t.name }))}
                      currentFirstAnnouncerTeamId={round.firstAnnouncerTeamId}
                    />
                  </div>
                )}
                {matchmakingInProgress ? (
                  <LiveMatchmakingAdminPanel
                    roundId={round.id}
                    roundName={round.name}
                    teams={round.teams.map((t) => ({
                      id: t.id,
                      name: t.name,
                      captainName: t.captain?.name ?? null,
                      captainAccessToken: t.captainAccessToken,
                    }))}
                    statusLabel={matchmakingStatusLabel}
                  />
                ) : (
                  <>
                    {livePairingMatchmakingApplies && twosomeLockState?.isComplete && !hasCaptainTokens && round.matches.length === 0 && (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-fairway-400/40 bg-fairway-50/40 p-3">
                        <p className="text-xs text-ink-700/60">Let captains set up the matchups live, for everyone to watch.</p>
                        <EnableCaptainLinksButton roundId={round.id} label="Enable Live Matchmaking" />
                      </div>
                    )}
                    <RoundMatchCreator round={round} teams={round.teams} />
                    <div className="mt-4">
                      <RoundMatchList matches={round.matches} />
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">4. Finish Round</h2>
            <RoundCompletePanel round={round} />
          </section>
        </>
      )}
    </div>
  );
}
