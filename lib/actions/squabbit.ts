"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { getRoundWithDetails, getMatchWithDetails, getCourses, getActiveTournament } from "@/lib/data";
import {
  buildSquabbitPlayersCsv,
  parseSquabbitMatchCsv,
  computeMatchImport,
  type MatchImportResult,
  type MatchImportParticipant,
} from "@/lib/squabbit";

export interface FormState {
  error?: string;
  success?: boolean;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Builds Squabbit's player-import CSV for a round's roster — both teams
 * once the draft's set them, so the Team column comes along for free.
 * Admin-only since it surfaces email/phone. */
export async function exportSquabbitPlayersCsv(roundId: string): Promise<{ csv?: string; error?: string }> {
  await requireAdminSession();
  const round = await getRoundWithDetails(roundId);
  if (!round) return { error: "Round not found." };
  if (round.teams.length !== 2) {
    return { error: "This round doesn't have teams yet — run the draft (or set rosters manually) first." };
  }

  const players = round.teams.flatMap((team) =>
    team.memberships.map((m) => ({
      name: m.player.name,
      email: m.player.email,
      phone: m.player.phone,
      gender: m.player.gender,
      whsId: m.player.whsId,
      handicapIndex: m.player.handicapIndex,
      teamName: team.name,
      preferredTee: m.player.preferredTee,
      transport: m.player.transport,
    })),
  );

  return { csv: buildSquabbitPlayersCsv(players) };
}

async function loadParticipants(matchId: string) {
  const match = await getMatchWithDetails(matchId);
  if (!match) return null;
  const participants: MatchImportParticipant[] = match.participants.map((p) => ({
    playerId: p.playerId,
    playerName: p.player.name,
    side: p.side as "A" | "B",
  }));
  return { match, participants };
}

/** Read-only: parses a pasted Squabbit round export and shows what it would
 * change, without writing anything — the admin reviews this before
 * committing (see applySquabbitMatchImport). */
export async function previewSquabbitMatchImport(matchId: string, csvText: string): Promise<{ result?: MatchImportResult; error?: string }> {
  await requireAdminSession();
  const loaded = await loadParticipants(matchId);
  if (!loaded) return { error: "Match not found." };

  const parsed = parseSquabbitMatchCsv(csvText);
  if (parsed.players.length === 0) {
    return { error: "Couldn't find a scorecard in that CSV — make sure you copied the whole export." };
  }

  return { result: computeMatchImport(parsed, loaded.participants) };
}

/** Writes the computed segments (and match status) from a Squabbit export
 * onto this match. Also opportunistically fills in the course and
 * scheduled date if they're parseable and not already set differently —
 * best-effort, since Squabbit's date text and our course names aren't
 * guaranteed to line up exactly. */
export async function applySquabbitMatchImport(matchId: string, csvText: string): Promise<FormState> {
  await requireAdminSession();
  const loaded = await loadParticipants(matchId);
  if (!loaded) return { error: "Match not found." };
  const { match, participants } = loaded;

  const parsed = parseSquabbitMatchCsv(csvText);
  if (parsed.players.length === 0) {
    return { error: "Couldn't find a scorecard in that CSV — make sure you copied the whole export." };
  }

  const result = computeMatchImport(parsed, participants);
  const segmentsByName = new Map(match.segments.map((s) => [s.name, s]));

  const segmentUpdates = result.segments.flatMap((seg) => {
    const existing = segmentsByName.get(seg.segmentName);
    if (!existing) return [];
    return [
      prisma.matchSegment.update({
        where: { id: existing.id },
        data: { teamAScore: seg.teamAScore, teamBScore: seg.teamBScore, winner: seg.winner, status: seg.status },
      }),
    ];
  });

  let courseId: string | undefined;
  if (result.courseName) {
    const tournament = await getActiveTournament();
    const courses = await getCourses(tournament.id);
    const course = courses.find((c) => c.name.toLowerCase() === result.courseName!.toLowerCase());
    if (course) courseId = course.id;
  }

  let scheduledDate: Date | undefined;
  if (result.dateText) {
    const parsedDate = new Date(result.dateText);
    if (!Number.isNaN(parsedDate.getTime())) scheduledDate = parsedDate;
  }

  await prisma.$transaction([
    ...segmentUpdates,
    prisma.match.update({
      where: { id: matchId },
      data: { status: result.matchStatus, ...(courseId ? { courseId } : {}), ...(scheduledDate ? { scheduledDate } : {}) },
    }),
  ]);

  revalidateAll();
  return { success: true };
}
