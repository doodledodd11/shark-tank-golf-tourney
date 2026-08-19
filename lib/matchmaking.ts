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

/** Only Round 1 and Round 2 build matches this way — the championship
 * redrafts straight into 4-player teams and uses createMatchFromPlayers
 * instead (see lib/actions/matches.ts). */
function pairingsRoundTemplate(roundNumber: number): "ROUND_1" | "ROUND_2" | null {
  if (roundNumber === 1) return "ROUND_1";
  if (roundNumber === 2) return "ROUND_2";
  return null;
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
  if (round.teams.length !== 2 || !pairingsRoundTemplate(round.number)) return null;
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
  const state = computeMatchmakingState(teams, unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })), round.matches.length);

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
  const state = computeMatchmakingState(teams, unmatched.map((p) => ({ id: p.id, teamId: p.teamId, announced: p.announced })), round.matches.length);

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
