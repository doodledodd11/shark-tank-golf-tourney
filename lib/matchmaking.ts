// Core I/O for the two captain-driven phases between a round's draft and
// its matches: twosome locking, then live matchmaking. Deliberately kept
// free of Next.js request-scoped calls (cookies-based admin auth,
// revalidatePath), same pattern as draft.ts — see lib/actions/matchmaking.ts
// for the "use server" wrappers that add the actual authorization: the
// admin-only actions require a session, the captain actions rely on the
// per-team token alone, matching the reasoning already established for the
// live draft. Never export these directly from a "use server" file.

import { prisma } from "@/lib/db";
import { getRoundWithDetails, type RoundWithDetails } from "@/lib/data";
import { SEGMENT_TEMPLATES } from "@/lib/segment-templates";
import { computeTwosomeLockState, computeMatchmakingState, type MatchmakingTeam } from "@/lib/matchmaking-logic";

export interface FormState {
  error?: string;
  success?: boolean;
}

/** Round 1 and Round 2 build all their matches through live pairing
 * matchmaking (announce/respond). The championship's team matches use
 * twosomes too, but matched up *randomly* instead (see
 * randomizeChampionshipTeamMatchupsLogic) — the site's rules don't call
 * for a live announce/respond ritual for just two matches, and mixing
 * "live for some championship matches, not others" would be confusing. */
function pairingsRoundTemplate(roundNumber: number): "ROUND_1" | "ROUND_2" | null {
  if (roundNumber === 1) return "ROUND_1";
  if (roundNumber === 2) return "ROUND_2";
  return null;
}

/** Twosome locking itself applies to all three rounds — the championship's
 * 4-player rosters still split into 2-man twosomes for its two team
 * matches, just built the same private, captain-driven way as Round 1/2. */
function twosomeLockApplies(roundNumber: number): boolean {
  return roundNumber === 1 || roundNumber === 2 || roundNumber === 3;
}

function toMatchmakingTeams(round: RoundWithDetails): [MatchmakingTeam, MatchmakingTeam] {
  const [a, b] = round.teams;
  return [
    { id: a!.id, order: a!.order },
    { id: b!.id, order: b!.order },
  ];
}

function unmatchedPairings(round: RoundWithDetails) {
  const matchedIds = new Set(
    round.matches.flatMap((m) => [m.pairingAId, m.pairingBId].filter((id): id is string => Boolean(id))),
  );
  return round.pairings.filter((p) => !matchedIds.has(p.id));
}

/** Issues a captainAccessToken for either team that doesn't already have
 * one. The draft already issues these at start, so most of the time this
 * is a no-op — but a round whose roster was set manually (no live draft)
 * never got tokens, and this is what a captain needs to reach twosome
 * locking or matchmaking either way. Safe to call any time teams exist;
 * reuses whatever token already exists rather than rotating it, so a
 * captain's one link keeps working across every later phase of the round. */
export async function ensureCaptainAccessTokensLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.teams.length !== 2) return { error: "This round doesn't have two teams yet." };

  for (const team of round.teams) {
    if (team.captainAccessToken) continue;
    await prisma.team.update({ where: { id: team.id }, data: { captainAccessToken: crypto.randomUUID() } });
  }
  return { success: true };
}

/** Admin override for who announces first in live matchmaking (pairing or
 * singles) — see the field's comment on Round in schema.prisma. Pass
 * `null` to go back to the default (team order 0). */
export async function setFirstAnnouncerLogic(roundId: string, teamId: string | null): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (teamId && !round.teams.some((t) => t.id === teamId)) {
    return { error: "That team isn't in this round." };
  }
  await prisma.round.update({ where: { id: roundId }, data: { firstAnnouncerTeamId: teamId } });
  return { success: true };
}

// --------------------------------------------------------------------------
// Phase 1: twosome locking — private to each captain, no turn order.
// --------------------------------------------------------------------------

export interface TwosomeLockBoardData {
  round: { id: string; name: string; number: number };
  myTeamId: string;
  myTeamName: string;
  roster: { id: string; name: string; tier: number }[];
  pairedPlayerIds: string[];
  pairings: { id: string; player1: { id: string; name: string; tier: number }; player2: { id: string; name: string; tier: number } }[];
  requiredPairings: number;
  isComplete: boolean;
  otherTeamLockedCount: number;
  otherTeamRequired: number;
  otherTeamComplete: boolean;
}

/** Everything one captain's twosome-locking page needs — deliberately
 * scoped to just their own team. The other team's actual pairings are
 * never included here, only a count, so the "without knowing how the
 * opposing team has grouped its own" rule holds even against a captain
 * reading the raw API response. */
export async function getTwosomeLockBoardData(roundId: string, captainToken: string): Promise<TwosomeLockBoardData | null> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return null;
  if (round.teams.length !== 2 || !twosomeLockApplies(round.number)) return null;
  const myTeam = round.teams.find((t) => t.captainAccessToken === captainToken);
  if (!myTeam) return null;
  const otherTeam = round.teams.find((t) => t.id !== myTeam.id)!;

  const lockedCountByTeam: Record<string, number> = {};
  for (const p of round.pairings) {
    if (!p.locked) continue;
    lockedCountByTeam[p.teamId] = (lockedCountByTeam[p.teamId] ?? 0) + 1;
  }
  const rosterSize = myTeam.memberships.length;
  const state = computeTwosomeLockState([{ id: myTeam.id }, { id: otherTeam.id }], rosterSize, lockedCountByTeam);
  const myState = state.teams.find((t) => t.teamId === myTeam.id)!;
  const otherState = state.teams.find((t) => t.teamId === otherTeam.id)!;

  const myPairings = round.pairings.filter((p) => p.teamId === myTeam.id);
  const pairedPlayerIds = new Set(myPairings.flatMap((p) => [p.player1Id, p.player2Id]));

  return {
    round: { id: round.id, name: round.name, number: round.number },
    myTeamId: myTeam.id,
    myTeamName: myTeam.name,
    roster: myTeam.memberships.map((m) => ({ id: m.player.id, name: m.player.name, tier: m.player.tier })),
    pairedPlayerIds: [...pairedPlayerIds],
    pairings: myPairings.map((p) => ({
      id: p.id,
      player1: { id: p.player1.id, name: p.player1.name, tier: p.player1.tier },
      player2: { id: p.player2.id, name: p.player2.name, tier: p.player2.tier },
    })),
    requiredPairings: myState.requiredPairings,
    isComplete: myState.isComplete,
    otherTeamLockedCount: otherState.lockedCount,
    otherTeamRequired: otherState.requiredPairings,
    otherTeamComplete: otherState.isComplete,
  };
}

export async function lockTwosomeLogic(input: {
  roundId: string;
  captainToken: string;
  player1Id: string;
  player2Id: string;
}): Promise<FormState> {
  if (input.player1Id === input.player2Id) return { error: "Pick two different players." };

  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That link isn't valid." };

  const rosterIds = new Set(myTeam.memberships.map((m) => m.playerId));
  if (!rosterIds.has(input.player1Id) || !rosterIds.has(input.player2Id)) {
    return { error: "Both players must be on your own roster." };
  }

  const myPairings = round.pairings.filter((p) => p.teamId === myTeam.id);
  const pairedPlayerIds = new Set(myPairings.flatMap((p) => [p.player1Id, p.player2Id]));
  if (pairedPlayerIds.has(input.player1Id) || pairedPlayerIds.has(input.player2Id)) {
    return { error: "One of those players is already in a twosome." };
  }

  const requiredPairings = myTeam.memberships.length / 2;
  if (myPairings.length >= requiredPairings) {
    return { error: "Your team's twosomes are already set." };
  }

  await prisma.pairing.create({
    data: {
      roundId: input.roundId,
      teamId: myTeam.id,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      order: myPairings.length,
      locked: true,
    },
  });

  // If that leaves exactly two players on my own roster unpaired, they can
  // only go together — auto-lock that last twosome too instead of making
  // the captain click again for the one pairing that isn't a real choice.
  const stillUnpaired = myTeam.memberships
    .map((m) => m.playerId)
    .filter((id) => id !== input.player1Id && id !== input.player2Id && !pairedPlayerIds.has(id));
  if (stillUnpaired.length === 2) {
    await prisma.pairing.create({
      data: {
        roundId: input.roundId,
        teamId: myTeam.id,
        player1Id: stillUnpaired[0]!,
        player2Id: stillUnpaired[1]!,
        order: myPairings.length + 1,
        locked: true,
      },
    });
  }

  return { success: true };
}

export async function deleteTwosomeLogic(input: { roundId: string; captainToken: string; pairingId: string }): Promise<FormState> {
  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That link isn't valid." };

  const pairing = round.pairings.find((p) => p.id === input.pairingId && p.teamId === myTeam.id);
  if (!pairing) return { error: "Twosome not found." };

  const usedInMatch = round.matches.some((m) => m.pairingAId === pairing.id || m.pairingBId === pairing.id);
  if (usedInMatch) return { error: "Can't undo a twosome that's already been matched. Cancel matchmaking first." };

  await prisma.pairing.delete({ where: { id: pairing.id } });
  return { success: true };
}

/** Wipes every locked twosome for a round so both captains can start over —
 * only allowed before matchmaking has built any matches from them (same
 * "delete the downstream thing first" ordering as deleteTwosomeLogic's
 * per-pairing guard, just applied to the whole round at once). */
export async function resetTwosomeLockLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.matches.length > 0) {
    return { error: "Matchmaking has already started from these twosomes. Cancel matchmaking first." };
  }
  if (round.pairings.length === 0) return { error: "There are no twosomes to reset." };

  await prisma.pairing.deleteMany({ where: { roundId } });
  return { success: true };
}

// --------------------------------------------------------------------------
// Phase 2: live matchmaking — public, alternating.
// --------------------------------------------------------------------------

export interface MatchmakingPairingSummary {
  id: string;
  teamId: string;
  player1Name: string;
  player1Tier: number;
  player2Name: string;
  player2Tier: number;
  announced: boolean;
  opponentPairingId: string | null;
}

export interface MatchmakingBoardData {
  round: { id: string; name: string; number: number };
  teams: { id: string; name: string; order: number }[];
  pairings: MatchmakingPairingSummary[];
  phase: "ANNOUNCE" | "RESPOND" | null;
  onTheClockTeamId: string | null;
  announcedPairingId: string | null;
  isComplete: boolean;
  myTeamId: string | null;
}

/** Everything the matchmaking board (spectator or captain view) needs —
 * every locked twosome for BOTH teams, since at this phase the twosomes
 * themselves are public knowledge (the rules only keep the *pairing
 * process* private, not the twosomes it produces — see /rules, "Alternating
 * Matchmaking"). `captainToken` only determines which team, if any, is
 * "yours" for the UI; reading the board never requires it. */
export async function getMatchmakingBoardData(roundId: string, captainToken?: string | null): Promise<MatchmakingBoardData | null> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return null;
  if (round.teams.length !== 2 || !pairingsRoundTemplate(round.number)) return null;

  const teams = toMatchmakingTeams(round);
  const unmatched = unmatchedPairings(round);
  const state = computeMatchmakingState(
    teams,
    unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
    round.matches.length,
    round.firstAnnouncerTeamId,
  );

  const opponentByPairing = new Map<string, string>();
  for (const m of round.matches) {
    if (m.pairingAId && m.pairingBId) {
      opponentByPairing.set(m.pairingAId, m.pairingBId);
      opponentByPairing.set(m.pairingBId, m.pairingAId);
    }
  }

  const myTeam = captainToken ? round.teams.find((t) => t.captainAccessToken === captainToken) : undefined;

  return {
    round: { id: round.id, name: round.name, number: round.number },
    teams: round.teams.map((t) => ({ id: t.id, name: t.name, order: t.order })),
    pairings: round.pairings.map((p) => ({
      id: p.id,
      teamId: p.teamId,
      player1Name: p.player1.name,
      player1Tier: p.player1.tier,
      player2Name: p.player2.name,
      player2Tier: p.player2.tier,
      announced: p.announced,
      opponentPairingId: opponentByPairing.get(p.id) ?? null,
    })),
    phase: state.phase,
    onTheClockTeamId: state.onTheClockTeamId,
    announcedPairingId: state.announcedPairingId,
    isComplete: state.isComplete,
    myTeamId: myTeam?.id ?? null,
  };
}

export async function announcePairingLogic(input: { roundId: string; captainToken: string; pairingId: string }): Promise<FormState> {
  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That link isn't valid." };

  const teams = toMatchmakingTeams(round);
  const unmatched = unmatchedPairings(round);
  const state = computeMatchmakingState(
    teams,
    unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
    round.matches.length,
    round.firstAnnouncerTeamId,
  );

  if (state.isComplete) return { error: "Every twosome already has an opponent." };
  if (state.phase !== "ANNOUNCE") return { error: "A twosome has already been announced — waiting on a response." };
  if (state.onTheClockTeamId !== myTeam.id) return { error: "It isn't your turn to announce." };

  const pairing = unmatched.find((p) => p.id === input.pairingId && p.teamId === myTeam.id);
  if (!pairing) return { error: "That twosome isn't yours to announce, or it's already been matched." };

  await prisma.pairing.update({ where: { id: pairing.id }, data: { announced: true } });
  return { success: true };
}

function pairingMatchCreateData(input: {
  roundId: string;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  teamAPairing: { id: string; player1Id: string; player2Id: string };
  teamBPairing: { id: string; player1Id: string; player2Id: string };
  template: keyof typeof SEGMENT_TEMPLATES;
}) {
  return {
    roundId: input.roundId,
    matchNumber: input.matchNumber,
    teamAId: input.teamAId,
    teamBId: input.teamBId,
    pairingAId: input.teamAPairing.id,
    pairingBId: input.teamBPairing.id,
    status: "COURSE_SELECTION" as const,
    participants: {
      create: [
        { playerId: input.teamAPairing.player1Id, side: "A" as const },
        { playerId: input.teamAPairing.player2Id, side: "A" as const },
        { playerId: input.teamBPairing.player1Id, side: "B" as const },
        { playerId: input.teamBPairing.player2Id, side: "B" as const },
      ],
    },
    segments: { create: SEGMENT_TEMPLATES[input.template] },
  };
}

export async function respondToPairingLogic(input: { roundId: string; captainToken: string; pairingId: string }): Promise<FormState> {
  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  const template = pairingsRoundTemplate(round.number);
  if (!template) return { error: "This round doesn't build matches this way." };
  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That link isn't valid." };

  const teams = toMatchmakingTeams(round);
  const unmatched = unmatchedPairings(round);
  const state = computeMatchmakingState(
    teams,
    unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
    round.matches.length,
    round.firstAnnouncerTeamId,
  );

  if (state.phase !== "RESPOND") return { error: "There's no pending announcement to respond to." };
  if (state.onTheClockTeamId !== myTeam.id) return { error: "It isn't your turn to respond." };

  const responsePairing = unmatched.find((p) => p.id === input.pairingId && p.teamId === myTeam.id);
  if (!responsePairing) return { error: "That twosome isn't yours to offer, or it's already been matched." };
  const announcedPairing = unmatched.find((p) => p.id === state.announcedPairingId);
  if (!announcedPairing) return { error: "The announced twosome couldn't be found." };

  const teamAId = round.teams[0]!.id;
  const teamBId = round.teams[1]!.id;
  const teamAPairing = announcedPairing.teamId === teamAId ? announcedPairing : responsePairing;
  const teamBPairing = announcedPairing.teamId === teamAId ? responsePairing : announcedPairing;

  // If that leaves exactly one twosome per team, they can only play each
  // other — auto-build that final match too instead of making the
  // captains go through announce/respond for a pairing that isn't a real
  // choice.
  const remaining = unmatched.filter((p) => p.id !== teamAPairing.id && p.id !== teamBPairing.id);
  const remainingA = remaining.find((p) => p.teamId === teamAId);
  const remainingB = remaining.find((p) => p.teamId === teamBId);

  await prisma.$transaction([
    prisma.match.create({
      data: pairingMatchCreateData({
        roundId: input.roundId,
        matchNumber: round.matches.length + 1,
        teamAId,
        teamBId,
        teamAPairing,
        teamBPairing,
        template,
      }),
    }),
    prisma.pairing.update({ where: { id: announcedPairing.id }, data: { announced: false } }),
    ...(remaining.length === 2 && remainingA && remainingB
      ? [
          prisma.match.create({
            data: pairingMatchCreateData({
              roundId: input.roundId,
              matchNumber: round.matches.length + 2,
              teamAId,
              teamBId,
              teamAPairing: remainingA,
              teamBPairing: remainingB,
              template,
            }),
          }),
        ]
      : []),
  ]);
  return { success: true };
}

/** Undoes live matchmaking for a round: deletes every match it built (and
 * their segments/participants, via cascade) and clears any stray
 * "announced" flag, so the admin can restart it from scratch. The locked
 * twosomes themselves are untouched — nobody has to redo twosome locking
 * just because matchmaking needs a redo. */
export async function cancelMatchmakingLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (!pairingsRoundTemplate(round.number)) return { error: "This round doesn't use live matchmaking." };
  if (round.matches.length === 0) return { error: "There's no matchmaking in progress to cancel." };

  await prisma.$transaction([
    prisma.match.deleteMany({ where: { roundId } }),
    prisma.pairing.updateMany({ where: { roundId }, data: { announced: false } }),
  ]);
  return { success: true };
}

// --------------------------------------------------------------------------
// Championship-only: random team matchups, then seed-paired singles.
//
// The championship still splits into two 4-player teams and builds two
// 2v2 twosomes each (see twosomeLockApplies above), but its rules don't
// call for a live announce/respond ritual over just two matches — the
// site's spec has the team matchups drawn randomly instead. Singles are
// paired by seed rank within each team's own roster (best vs best,
// 2nd-best vs 2nd-best, ...) rather than captains choosing — see
// pairSinglesBySeedLogic.
// --------------------------------------------------------------------------

/** Randomly pairs up each team's still-unmatched locked twosomes into
 * matches — the championship's "First 18: two 2v2 team matches," decided
 * by a draw rather than the captains announcing/responding. */
export async function randomizeChampionshipTeamMatchupsLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.number !== 3) return { error: "Random matchups are only for the championship's team matches." };
  if (round.teams.length !== 2) return { error: "This round needs two teams first." };

  const teamAId = round.teams[0]!.id;
  const teamBId = round.teams[1]!.id;
  const unmatched = unmatchedPairings(round);
  const teamAPairings = unmatched.filter((p) => p.teamId === teamAId && p.locked);
  const teamBPairings = unmatched.filter((p) => p.teamId === teamBId && p.locked);
  if (teamAPairings.length === 0 || teamAPairings.length !== teamBPairings.length) {
    return { error: "Both teams need the same number of locked, unmatched twosomes before randomizing." };
  }

  const shuffledB = [...teamBPairings].sort(() => Math.random() - 0.5);
  const baseMatchNumber = round.matches.length;

  await prisma.$transaction(
    teamAPairings.map((pairingA, i) => {
      const pairingB = shuffledB[i]!;
      return prisma.match.create({
        data: {
          roundId,
          matchNumber: baseMatchNumber + i + 1,
          teamAId,
          teamBId,
          pairingAId: pairingA.id,
          pairingBId: pairingB.id,
          status: "COURSE_SELECTION",
          participants: {
            create: [
              { playerId: pairingA.player1Id, side: "A" },
              { playerId: pairingA.player2Id, side: "A" },
              { playerId: pairingB.player1Id, side: "B" },
              { playerId: pairingB.player2Id, side: "B" },
            ],
          },
          segments: { create: SEGMENT_TEMPLATES.CHAMPIONSHIP_TEAM },
        },
      });
    }),
  );
  return { success: true };
}

/** Players not yet in a singles match this round — deliberately excludes
 * anyone already seated in one of the round's 2v2 team matches (those
 * have pairingAId/pairingBId set) or a captain playoff (isPlayoff), since
 * neither of those is a singles pairing even though both also skip the
 * Pairing table. */
function unmatchedSinglesPlayers(round: RoundWithDetails) {
  const singlesMatchedPlayerIds = new Set(
    round.matches
      .filter((m) => !m.pairingAId && !m.pairingBId && !m.isPlayoff)
      .flatMap((m) => m.participants.map((p) => p.playerId)),
  );
  return round.teams.flatMap((t) =>
    t.memberships
      .filter((m) => !singlesMatchedPlayerIds.has(m.playerId))
      .map((m) => ({ id: m.playerId, teamId: t.id, name: m.player.name, tier: m.player.tier, seed: m.player.seed })),
  );
}

function singlesMatchCreateData(input: {
  roundId: string;
  matchNumber: number;
  teamAId: string;
  teamBId: string;
  sideAPlayerId: string;
  sideBPlayerId: string;
}) {
  return {
    roundId: input.roundId,
    matchNumber: input.matchNumber,
    teamAId: input.teamAId,
    teamBId: input.teamBId,
    status: "COURSE_SELECTION" as const,
    participants: {
      create: [
        { playerId: input.sideAPlayerId, side: "A" as const },
        { playerId: input.sideBPlayerId, side: "B" as const },
      ],
    },
    segments: { create: SEGMENT_TEMPLATES.CHAMPIONSHIP_SINGLES },
  };
}

/** Best-to-worst ordering within a team's own roster: tier first (lower
 * tier number is better), then seed within a tier (lower is better), with
 * anyone missing a seed sorted after everyone who has one, and name as a
 * final tiebreak so the order is always deterministic. */
function bySeedRank(a: { tier: number; seed: number | null; name: string }, b: typeof a): number {
  if (a.tier !== b.tier) return a.tier - b.tier;
  if (a.seed != null && b.seed != null && a.seed !== b.seed) return a.seed - b.seed;
  if (a.seed == null && b.seed != null) return 1;
  if (a.seed != null && b.seed == null) return -1;
  return a.name.localeCompare(b.name);
}

/** Pairs every unmatched singles player by seed rank within their own
 * team's roster — team A's best remaining player vs team B's best
 * remaining, 2nd-best vs 2nd-best, and so on — instead of a live
 * announce/respond ritual. Falls back to (tier, then name) ordering for
 * anyone without a seed set, so it still produces a sensible pairing even
 * before every player has one. */
export async function pairSinglesBySeedLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.number !== 3) return { error: "Seed pairing is only for the championship's singles matches." };
  if (round.teams.length !== 2) return { error: "This round needs two teams first." };

  const teamAId = round.teams[0]!.id;
  const teamBId = round.teams[1]!.id;
  const unmatched = unmatchedSinglesPlayers(round);
  const teamAPlayers = [...unmatched.filter((p) => p.teamId === teamAId)].sort(bySeedRank);
  const teamBPlayers = [...unmatched.filter((p) => p.teamId === teamBId)].sort(bySeedRank);
  if (teamAPlayers.length === 0 || teamAPlayers.length !== teamBPlayers.length) {
    return { error: "Both teams need the same number of unmatched players before pairing by seed." };
  }

  const baseMatchNumber = round.matches.length;

  await prisma.$transaction(
    teamAPlayers.map((playerA, i) =>
      prisma.match.create({
        data: singlesMatchCreateData({
          roundId,
          matchNumber: baseMatchNumber + i + 1,
          teamAId,
          teamBId,
          sideAPlayerId: playerA.id,
          sideBPlayerId: teamBPlayers[i]!.id,
        }),
      }),
    ),
  );
  return { success: true };
}

/** Deletes every singles match built so far, for a redo — mirrors
 * cancelMatchmakingLogic but scoped to just the singles matches (leaving
 * the round's 2v2 team matches, if any, untouched). */
export async function cancelSinglesMatchmakingLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.number !== 3) return { error: "This round doesn't use singles matchmaking." };

  const singlesMatchIds = round.matches.filter((m) => !m.pairingAId && !m.pairingBId && !m.isPlayoff).map((m) => m.id);
  if (singlesMatchIds.length === 0) return { error: "There's no singles matchmaking in progress to cancel." };

  await prisma.match.deleteMany({ where: { id: { in: singlesMatchIds } } });
  return { success: true };
}
