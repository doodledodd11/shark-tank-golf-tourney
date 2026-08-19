import { getActiveTournament, getRoundsWithDetails } from "@/lib/data";
import type { TournamentStatus } from "@/lib/constants";
import { Hero } from "@/components/home/hero";
import { LiveDraftBanner } from "@/components/home/live-draft-banner";
import { LiveMatchmakingBanner } from "@/components/home/live-matchmaking-banner";
import { Progression } from "@/components/home/progression";
import { PrizePool } from "@/components/home/prize-pool";
import { HowItWorks } from "@/components/home/how-it-works";
import { FormatCards } from "@/components/home/format-cards";
import { StatusSection } from "@/components/home/status-section";
import { UpcomingMatches } from "@/components/home/upcoming-matches";

export default async function HomePage() {
  const tournament = await getActiveTournament();
  const rounds = await getRoundsWithDetails(tournament.id);

  // A round counts as "live" here the same way the draft board itself does
  // (lib/draft.ts / lib/draft-logic.ts): tokens issued, and not every seat
  // filled yet. Derived from data already on hand rather than tournament
  // .status, since that's a coarser, admin-set label that doesn't have a
  // distinct value for "Championship draft" the way it does for Round 1/2.
  const activeDraftRound = rounds.find((r) => {
    if (r.teams.length !== 2) return false;
    if (!r.teams.some((t) => t.captainAccessToken)) return false;
    const totalDrafted = r.teams.reduce((sum, t) => sum + t.memberships.length, 0);
    return totalDrafted < r.playersStart;
  });

  // Same idea as activeDraftRound, one phase later: twosomes are all
  // locked (pairings cover the whole roster) but matchmaking hasn't
  // matched every twosome into a match yet.
  const activeMatchmakingRound = rounds.find((r) => {
    if (r.number !== 1 && r.number !== 2) return false;
    if (r.teams.length !== 2) return false;
    if (!r.teams.some((t) => t.captainAccessToken)) return false;
    // Each team needs (roster size / 2) pairings; both teams' rosters are
    // always equal, so that sum works out to exactly one roster's length.
    const totalRequiredPairings = r.teams[0]!.memberships.length;
    if (r.pairings.length < totalRequiredPairings) return false;
    const matchedIds = new Set(r.matches.flatMap((m) => [m.pairingAId, m.pairingBId].filter(Boolean)));
    return r.pairings.some((p) => !matchedIds.has(p.id));
  });

  const allMatches = rounds.flatMap((r) => r.matches);
  const notComplete = allMatches
    .filter((m) => m.status !== "COMPLETE")
    .sort((a, b) => {
      if (!a.scheduledDate && !b.scheduledDate) return 0;
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });
  const complete = allMatches
    .filter((m) => m.status === "COMPLETE")
    .sort((a, b) => (b.scheduledDate?.getTime() ?? 0) - (a.scheduledDate?.getTime() ?? 0));
  const homeMatches = [...notComplete.slice(0, 4), ...complete.slice(0, 2)];
  const roundNameById = new Map(rounds.map((r) => [r.id, r.name]));

  const status = tournament.status as TournamentStatus;

  return (
    <>
      {activeDraftRound && <LiveDraftBanner roundId={activeDraftRound.id} roundName={activeDraftRound.name} />}
      {activeMatchmakingRound && (
        <LiveMatchmakingBanner roundId={activeMatchmakingRound.id} roundName={activeMatchmakingRound.name} />
      )}
      <Hero name={tournament.name} subtitle={tournament.subtitle} status={status} />
      <Progression status={status} />
      <PrizePool
        prizePoolCents={tournament.prizePoolCents}
        entryFeeCents={tournament.entryFeeCents}
        paidPlayerCount={tournament.paidPlayerCount}
        championshipSplitSize={tournament.championshipSplitSize}
      />
      <HowItWorks />
      <FormatCards />
      <StatusSection status={status} />
      <UpcomingMatches matches={homeMatches} roundNameById={roundNameById} />
    </>
  );
}
