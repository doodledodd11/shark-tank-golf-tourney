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
  pairings: { id: string; player1: { id: string; name: string }; player2: { id: string; name: string } }[];
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
      player1: { id: p.player1.id, name: p.player1.name },
      player2: { id: p.player2.id, name: p.player2.name },
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
  player2Name: string;
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
      player2Name: p.player2.name,
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
  const teamAPairing = announcedPairing.teamId === teamAId ? announcedPairing : responsePairing;
  const teamBPairing = announcedPairing.teamId === teamAId ? responsePairing : announcedPairing;

  await prisma.$transaction([
    prisma.match.create({
      data: {
        roundId: input.roundId,
        matchNumber: round.matches.length + 1,
        teamAId: round.teams[0]!.id,
        teamBId: round.teams[1]!.id,
        pairingAId: teamAPairing.id,
        pairingBId: teamBPairing.id,
        status: "COURSE_SELECTION",
        participants: {
          create: [
            { playerId: teamAPairing.player1Id, side: "A" },
            { playerId: teamAPairing.player2Id, side: "A" },
            { playerId: teamBPairing.player1Id, side: "B" },
            { playerId: teamBPairing.player2Id, side: "B" },
          ],
        },
        segments: { create: SEGMENT_TEMPLATES[template] },
      },
    }),
    prisma.pairing.update({ where: { id: announcedPairing.id }, data: { announced: false } }),
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
// Championship-only: random team matchups, then singles matchmaking.
//
// The championship still splits into two 4-player teams and builds two
// 2v2 twosomes each (see twosomeLockApplies above), but its rules don't
// call for a live announce/respond ritual over just two matches — the
// site's spec has the team matchups drawn randomly instead. Singles,
// though, go through the same live announce/respond mechanic as Round
// 1/2's twosomes, just one player at a time instead of a pair — see
// TeamMembership.announced, the singles equivalent of Pairing.announced.
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
      .map((m) => ({ id: m.playerId, teamId: t.id, name: m.player.name, announced: m.announced })),
  );
}

function singlesMatchesBuiltCount(round: RoundWithDetails): number {
  return round.matches.filter((m) => !m.pairingAId && !m.pairingBId && !m.isPlayoff).length;
}

export interface SinglesMatchmakingPlayerSummary {
  id: string;
  teamId: string;
  name: string;
  announced: boolean;
  opponentPlayerId: string | null;
}

export interface SinglesMatchmakingBoardData {
  round: { id: string; name: string; number: number };
  teams: { id: string; name: string; order: number }[];
  players: SinglesMatchmakingPlayerSummary[];
  phase: "ANNOUNCE" | "RESPOND" | null;
  onTheClockTeamId: string | null;
  announcedPlayerId: string | null;
  isComplete: boolean;
  myTeamId: string | null;
}

export async function getSinglesMatchmakingBoardData(roundId: string, captainToken?: string | null): Promise<SinglesMatchmakingBoardData | null> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return null;
  if (round.number !== 3 || round.teams.length !== 2) return null;

  const teams = toMatchmakingTeams(round);
  const unmatched = unmatchedSinglesPlayers(round);
  const state = computeMatchmakingState(
    teams,
    unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
    singlesMatchesBuiltCount(round),
    round.firstAnnouncerTeamId,
  );

  const opponentByPlayer = new Map<string, string>();
  for (const m of round.matches) {
    if (!m.pairingAId && !m.pairingBId && !m.isPlayoff && m.participants.length === 2) {
      const [p1, p2] = m.participants;
      opponentByPlayer.set(p1!.playerId, p2!.playerId);
      opponentByPlayer.set(p2!.playerId, p1!.playerId);
    }
  }

  const myTeam = captainToken ? round.teams.find((t) => t.captainAccessToken === captainToken) : undefined;

  return {
    round: { id: round.id, name: round.name, number: round.number },
    teams: round.teams.map((t) => ({ id: t.id, name: t.name, order: t.order })),
    players: round.teams.flatMap((t) =>
      t.memberships.map((m) => ({
        id: m.playerId,
        teamId: t.id,
        name: m.player.name,
        announced: m.announced,
        opponentPlayerId: opponentByPlayer.get(m.playerId) ?? null,
      })),
    ),
    phase: state.phase,
    onTheClockTeamId: state.onTheClockTeamId,
    announcedPlayerId: state.announcedPairingId,
    isComplete: state.isComplete,
    myTeamId: myTeam?.id ?? null,
  };
}

export async function announceSinglesLogic(input: { roundId: string; captainToken: string; playerId: string }): Promise<FormState> {
  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  if (round.number !== 3) return { error: "Singles matchmaking is only for the championship." };
  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That link isn't valid." };

  const teams = toMatchmakingTeams(round);
  const unmatched = unmatchedSinglesPlayers(round);
  const state = computeMatchmakingState(
    teams,
    unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
    singlesMatchesBuiltCount(round),
    round.firstAnnouncerTeamId,
  );

  if (state.isComplete) return { error: "Every player already has an opponent." };
  if (state.phase !== "ANNOUNCE") return { error: "A player has already been announced — waiting on a response." };
  if (state.onTheClockTeamId !== myTeam.id) return { error: "It isn't your turn to announce." };

  const player = unmatched.find((p) => p.id === input.playerId && p.teamId === myTeam.id);
  if (!player) return { error: "That player isn't yours to announce, or they're already matched." };

  await prisma.teamMembership.updateMany({ where: { teamId: myTeam.id, playerId: player.id }, data: { announced: true } });
  return { success: true };
}

export async function respondToSinglesLogic(input: { roundId: string; captainToken: string; playerId: string }): Promise<FormState> {
  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  if (round.number !== 3) return { error: "Singles matchmaking is only for the championship." };
  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That link isn't valid." };

  const teams = toMatchmakingTeams(round);
  const unmatched = unmatchedSinglesPlayers(round);
  const state = computeMatchmakingState(
    teams,
    unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })),
    singlesMatchesBuiltCount(round),
    round.firstAnnouncerTeamId,
  );

  if (state.phase !== "RESPOND") return { error: "There's no pending announcement to respond to." };
  if (state.onTheClockTeamId !== myTeam.id) return { error: "It isn't your turn to respond." };

  const responder = unmatched.find((p) => p.id === input.playerId && p.teamId === myTeam.id);
  if (!responder) return { error: "That player isn't yours to offer, or they're already matched." };
  const announced = unmatched.find((p) => p.id === state.announcedPairingId);
  if (!announced) return { error: "The announced player couldn't be found." };

  const teamAId = round.teams[0]!.id;
  const sideAPlayer = announced.teamId === teamAId ? announced : responder;
  const sideBPlayer = announced.teamId === teamAId ? responder : announced;

  await prisma.$transaction([
    prisma.match.create({
      data: {
        roundId: input.roundId,
        matchNumber: round.matches.length + 1,
        teamAId: round.teams[0]!.id,
        teamBId: round.teams[1]!.id,
        status: "COURSE_SELECTION",
        participants: {
          create: [
            { playerId: sideAPlayer.id, side: "A" },
            { playerId: sideBPlayer.id, side: "B" },
          ],
        },
        segments: { create: SEGMENT_TEMPLATES.CHAMPIONSHIP_SINGLES },
      },
    }),
    prisma.teamMembership.updateMany({ where: { teamId: announced.teamId, playerId: announced.id }, data: { announced: false } }),
  ]);
  return { success: true };
}

/** Deletes every singles match this flow has built, for a redo — mirrors
 * cancelMatchmakingLogic but scoped to just the singles matches (leaving
 * the round's 2v2 team matches, if any, untouched). */
export async function cancelSinglesMatchmakingLogic(roundId: string): Promise<FormState> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.number !== 3) return { error: "This round doesn't use singles matchmaking." };

  const singlesMatchIds = round.matches.filter((m) => !m.pairingAId && !m.pairingBId && !m.isPlayoff).map((m) => m.id);
  if (singlesMatchIds.length === 0) return { error: "There's no singles matchmaking in progress to cancel." };

  await prisma.$transaction([
    prisma.match.deleteMany({ where: { id: { in: singlesMatchIds } } }),
    prisma.teamMembership.updateMany({ where: { team: { roundId } }, data: { announced: false } }),
  ]);
  return { success: true };
}
