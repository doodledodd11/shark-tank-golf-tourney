"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";
import { getMatchWithDetails } from "@/lib/data";
import { ensureSideAccessTokensLogic, getScorecardEntryData, submitHoleScoresLogic, type FormState, type ScorecardEntryData } from "@/lib/scorecard";
import { sendScorecardLinkEmail, getSiteUrl } from "@/lib/email";

function revalidatePublicPages() {
  revalidatePath("/matches");
  revalidatePath("/players");
  revalidatePath("/");
}

export async function ensureSideAccessTokens(matchId: string): Promise<FormState> {
  await requireAdminSession();
  const result = await ensureSideAccessTokensLogic(matchId);
  if (result.success) revalidatePublicPages();
  return result;
}

// Public — a side's only credential is the token itself, same reasoning
// as every other captain/pairing/player link in this app.
export async function getScorecardEntry(matchId: string, token: string): Promise<ScorecardEntryData | null> {
  return getScorecardEntryData(matchId, token);
}

const submitSchema = z.object({
  matchId: z.string().min(1),
  token: z.string().min(1),
  holes: z.array(z.number().int().min(0).max(20)).length(18),
});

export async function submitHoleScores(input: { matchId: string; token: string; holes: number[] }): Promise<FormState> {
  const data = submitSchema.parse(input);
  const result = await submitHoleScoresLogic(data);
  if (result.success) revalidatePublicPages();
  return result;
}

/** Admin-only: makes sure both sides of a match have a link, then emails
 * whichever of the (up to 4) players involved have an address on file —
 * both teammates on a side get the same shared link. */
export async function sendScorecardEmails(matchId: string): Promise<{ error?: string; sent?: string[]; skipped?: string[] }> {
  await requireAdminSession();

  const ensured = await ensureSideAccessTokensLogic(matchId);
  if (ensured.error) return { error: ensured.error };

  const match = await getMatchWithDetails(matchId);
  if (!match) return { error: "Match not found." };

  const matchFresh = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
  const matchLabel = `${match.round.name} · Match ${match.matchNumber}`;
  const siteUrl = getSiteUrl();
  const sent: string[] = [];
  const skipped: string[] = [];

  for (const side of ["A", "B"] as const) {
    const sidePlayers = match.participants.filter((p) => p.side === side).map((p) => p.player);
    const emails = sidePlayers.map((p) => p.email).filter((e): e is string => Boolean(e));
    const names = sidePlayers.map((p) => p.name).join(" + ") || `Side ${side}`;
    const token = side === "A" ? matchFresh.teamASideAccessToken : matchFresh.teamBSideAccessToken;

    if (!token) {
      skipped.push(`${names} (no link issued)`);
      continue;
    }
    if (emails.length === 0) {
      skipped.push(`${names} (no email on file)`);
      continue;
    }

    const link = `${siteUrl}/scorecard/${matchId}/${token}`;
    const result = await sendScorecardLinkEmail({ to: emails, names, matchLabel, link });
    if (result.error) {
      skipped.push(`${names} (${result.error})`);
      continue;
    }
    sent.push(names);
  }

  revalidatePublicPages();
  return { sent, skipped };
}
