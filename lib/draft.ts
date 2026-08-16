// Core live-draft I/O logic, deliberately kept free of Next.js
// request-scoped calls (cookies-based admin auth, revalidatePath) so it can
// be exercised directly from tests without a request context — same
// pattern as round-completion.ts and round-roster.ts. The exported Server
// Actions in lib/actions/draft.ts add the actual authorization around
// these: startDraft requires an admin session (only the admin designates
// captains), but submitDraftPick deliberately does NOT — a captain isn't
// an admin, and their only credential is the per-team token checked here.
// Never export these directly from a "use server" file.

import { prisma } from "@/lib/db";
import { getRoundWithDetails, type RoundWithDetails } from "@/lib/data";
import { getEligiblePlayersForRound } from "@/lib/player-status";
import { computeDraftState, type DraftTeam } from "@/lib/draft-logic";

export interface FormState {
  error?: string;
  success?: boolean;
}

export interface DraftBoardData {
  round: { id: string; name: string; number: number; playersStart: number };
  teams: {
    id: string;
    name: string;
    order: number;
    captainId: string | null;
    captainName: string | null;
    roster: { id: string; name: string; tier: number }[];
  }[];
  undraftedPlayers: { id: string; name: string; tier: number }[];
  currentTier: number | null;
  onTheClockTeamId: string | null;
  picksPerTeamPerTier: number;
  isComplete: boolean;
  myTeamId: string | null;
}

/** The shape lib/draft-logic.ts's pure functions need, derived from a
 * loaded round — factored out since both submitDraftPickLogic and
 * getDraftBoardData need to recompute the current draft state fresh. */
function toDraftTeams(round: RoundWithDetails) {
  const draftTeams = round.teams.map((t): DraftTeam => ({ id: t.id, order: t.order })) as [DraftTeam, DraftTeam];
  const rosterPlayerIdsByTeam = Object.fromEntries(round.teams.map((t) => [t.id, t.memberships.map((m) => m.playerId)]));
  return { draftTeams, rosterPlayerIdsByTeam };
}

/** Starts a live draft for a round: designates the two captains, seats each
 * one onto their own team as their first pick, and issues each team a
 * fresh access token. Refuses if the round already has any roster at all —
 * this is a clean-slate operation, not a way to patch an existing draft. */
export async function startDraftLogic(input: {
  roundId: string;
  captainAPlayerId: string;
  captainBPlayerId: string;
}): Promise<FormState & { tokens?: { teamAToken: string; teamBToken: string } }> {
  if (input.captainAPlayerId === input.captainBPlayerId) {
    return { error: "The two captains must be different players." };
  }

  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };

  if (round.teams.length !== 0 && round.teams.length !== 2) {
    return { error: "This round is in an unexpected state — fix it from the round admin page first." };
  }
  const existingMemberships = round.teams.flatMap((t) => t.memberships);
  if (existingMemberships.length > 0 || round.teams.some((t) => t.captainAccessToken)) {
    return { error: "This round already has a roster or an active draft — start a live draft only on a clean round." };
  }

  const allPlayers = await prisma.player.findMany({ where: { tournamentId: round.tournamentId } });
  const eligibleIds = new Set(getEligiblePlayersForRound(round, allPlayers).map((p) => p.id));
  if (!eligibleIds.has(input.captainAPlayerId) || !eligibleIds.has(input.captainBPlayerId)) {
    return { error: "Both captains must be eligible players for this round." };
  }

  const teamAToken = crypto.randomUUID();
  const teamBToken = crypto.randomUUID();
  const existingTeamA = round.teams.find((t) => t.order === 0);
  const existingTeamB = round.teams.find((t) => t.order === 1);

  await prisma.$transaction(async (tx) => {
    const a = existingTeamA
      ? await tx.team.update({
          where: { id: existingTeamA.id },
          data: { captainId: input.captainAPlayerId, captainAccessToken: teamAToken },
        })
      : await tx.team.create({
          data: {
            roundId: input.roundId,
            name: "Team A",
            order: 0,
            captainId: input.captainAPlayerId,
            captainAccessToken: teamAToken,
          },
        });
    const b = existingTeamB
      ? await tx.team.update({
          where: { id: existingTeamB.id },
          data: { captainId: input.captainBPlayerId, captainAccessToken: teamBToken },
        })
      : await tx.team.create({
          data: {
            roundId: input.roundId,
            name: "Team B",
            order: 1,
            captainId: input.captainBPlayerId,
            captainAccessToken: teamBToken,
          },
        });

    await tx.teamMembership.createMany({
      data: [
        { teamId: a.id, playerId: input.captainAPlayerId },
        { teamId: b.id, playerId: input.captainBPlayerId },
      ],
    });
  });

  return { success: true, tokens: { teamAToken, teamBToken } };
}

/** Submits one captain's pick. The only authorization is the token match —
 * see the file header for why that's correct here, unlike everywhere else
 * in the app. Re-derives whose turn it actually is (never trusts the
 * client's idea of the board state) before allowing the pick through. */
export async function submitDraftPickLogic(input: {
  roundId: string;
  captainToken: string;
  playerId: string;
}): Promise<FormState> {
  const round = await getRoundWithDetails(input.roundId);
  if (!round) return { error: "Round not found." };
  if (round.teams.length !== 2) return { error: "This round isn't set up for a live draft." };

  const myTeam = round.teams.find((t) => t.captainAccessToken === input.captainToken);
  if (!myTeam) return { error: "That draft link isn't valid." };

  const allPlayers = await prisma.player.findMany({ where: { tournamentId: round.tournamentId } });
  const eligiblePlayers = getEligiblePlayersForRound(round, allPlayers);
  const { draftTeams, rosterPlayerIdsByTeam } = toDraftTeams(round);
  const state = computeDraftState(draftTeams, rosterPlayerIdsByTeam, eligiblePlayers, round.playersStart);

  if (state.isComplete) return { error: "The draft is already complete." };
  if (state.onTheClockTeamId !== myTeam.id) return { error: "It isn't your team's turn to pick." };

  const player = eligiblePlayers.find((p) => p.id === input.playerId);
  if (!player) return { error: "That player isn't eligible for this round." };
  if (player.tier !== state.currentTier) return { error: "That player isn't in the tier currently being drafted." };

  const alreadyDrafted = round.teams.some((t) => t.memberships.some((m) => m.playerId === input.playerId));
  if (alreadyDrafted) return { error: "That player has already been drafted." };

  await prisma.teamMembership.create({ data: { teamId: myTeam.id, playerId: input.playerId } });
  return { success: true };
}

/** Everything the draft board (spectator or captain view) needs to render.
 * `captainToken` is optional and only used to tell the viewer which team
 * (if any) is theirs — reading the board never requires it, since the
 * draft is public to watch the same way match results are. */
export async function getDraftBoardData(roundId: string, captainToken?: string | null): Promise<DraftBoardData | null> {
  const round = await getRoundWithDetails(roundId);
  if (!round) return null;
  if (round.teams.length !== 2) return null;

  const allPlayers = await prisma.player.findMany({ where: { tournamentId: round.tournamentId } });
  const playerNameById = new Map(allPlayers.map((p) => [p.id, p.name]));
  const eligiblePlayers = getEligiblePlayersForRound(round, allPlayers);
  const { draftTeams, rosterPlayerIdsByTeam } = toDraftTeams(round);
  const state = computeDraftState(draftTeams, rosterPlayerIdsByTeam, eligiblePlayers, round.playersStart);

  const draftedIds = new Set(round.teams.flatMap((t) => t.memberships.map((m) => m.playerId)));
  const undraftedPlayers = eligiblePlayers
    .filter((p) => !draftedIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, tier: p.tier }));

  const myTeam = captainToken ? round.teams.find((t) => t.captainAccessToken === captainToken) : undefined;

  return {
    round: { id: round.id, name: round.name, number: round.number, playersStart: round.playersStart },
    teams: round.teams.map((t) => ({
      id: t.id,
      name: t.name,
      order: t.order,
      captainId: t.captainId,
      captainName: t.captainId ? (playerNameById.get(t.captainId) ?? null) : null,
      roster: t.memberships.map((m) => ({ id: m.player.id, name: m.player.name, tier: m.player.tier })),
    })),
    undraftedPlayers,
    currentTier: state.currentTier,
    onTheClockTeamId: state.onTheClockTeamId,
    picksPerTeamPerTier: state.picksPerTeamPerTier,
    isComplete: state.isComplete,
    myTeamId: myTeam?.id ?? null,
  };
}
