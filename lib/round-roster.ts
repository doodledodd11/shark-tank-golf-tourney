// Core roster-assignment logic, deliberately kept free of Next.js
// request-scoped calls (cookies-based auth, revalidatePath) so it can be
// exercised directly from tests without a request context. The exported
// Server Action `setRoundRosters` in lib/actions/rounds.ts is the only
// intended caller in the running app — it adds the admin-session check and
// cache revalidation around this. This function performs no authorization
// of its own and must never be re-exported from a "use server" file, or it
// would become a publicly invocable, unauthenticated Server Action.

import { z } from "zod";
import { prisma } from "@/lib/db";

export interface FormState {
  error?: string;
  success?: boolean;
}

const nonEmptyIdArray = z.array(z.string().min(1));

const rosterSchema = z.object({
  roundId: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  teamAPlayerIds: nonEmptyIdArray,
  teamBPlayerIds: nonEmptyIdArray,
});

/** Replaces both teams' rosters wholesale — simpler and less error-prone
 * than diffing individual add/remove operations, and matches how an admin
 * actually thinks about a draft ("here is the final roster split"). Also
 * the tool for moving a single player to the other team later: toggle
 * their side and save — everything else about the two rosters stays put. */
export async function setRoundRostersLogic(input: {
  roundId: string;
  teamAId: string;
  teamBId: string;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
}): Promise<FormState> {
  const data = rosterSchema.parse(input);

  const overlap = data.teamAPlayerIds.filter((id) => data.teamBPlayerIds.includes(id));
  if (overlap.length > 0) {
    return { error: "A player can't be on both teams." };
  }
  const teamARosterIds = new Set(data.teamAPlayerIds);
  const teamBRosterIds = new Set(data.teamBPlayerIds);

  // A re-drafted roster — whether that's the initial draft or moving one
  // player to the other team afterward — can strand a pairing that no
  // longer matches who's actually on its team: either a player dropped off
  // the roster entirely, or (just as stale) switched to the other side
  // without their old pairing following them. Compare each pairing against
  // *its own* team's new roster, not the combined pool, so a side-switch is
  // caught the same way a removal is.
  const existingPairings = await prisma.pairing.findMany({
    where: { roundId: data.roundId },
    include: {
      player1: { select: { name: true } },
      player2: { select: { name: true } },
      matchesAsPairingA: { select: { id: true } },
      matchesAsPairingB: { select: { id: true } },
    },
  });
  const stalePairings = existingPairings.filter((p) => {
    const rosterIds = p.teamId === data.teamAId ? teamARosterIds : teamBRosterIds;
    return !rosterIds.has(p.player1Id) || !rosterIds.has(p.player2Id);
  });

  // A pairing already committed to a match can't be silently dropped —
  // that match may already carry real scores. Block the whole save with a
  // specific, actionable error instead of leaving the player half-moved
  // (a new team membership, but a stale pairing/match still tying them to
  // the old one) rather than guessing what the admin wants done with it.
  const blockingPairing = stalePairings.find((p) => p.matchesAsPairingA.length > 0 || p.matchesAsPairingB.length > 0);
  if (blockingPairing) {
    return {
      error: `${blockingPairing.player1.name} & ${blockingPairing.player2.name} are already a twosome committed to a match this round. Delete or reassign that match before moving either of them to the other team.`,
    };
  }
  const stalePairingIds = stalePairings.map((p) => p.id);

  await prisma.$transaction([
    prisma.teamMembership.deleteMany({ where: { teamId: { in: [data.teamAId, data.teamBId] } } }),
    prisma.teamMembership.createMany({
      data: [
        ...data.teamAPlayerIds.map((playerId) => ({ teamId: data.teamAId, playerId })),
        ...data.teamBPlayerIds.map((playerId) => ({ teamId: data.teamBId, playerId })),
      ],
    }),
    ...(stalePairingIds.length > 0 ? [prisma.pairing.deleteMany({ where: { id: { in: stalePairingIds } } })] : []),
  ]);

  return { success: true };
}
