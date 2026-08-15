import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getActiveTournament, getCourses, getMatchWithDetails } from "@/lib/data";
import { calculateMatchTotals } from "@/lib/tournament-logic";
import { formatPoints } from "@/lib/format";
import { getSideNames } from "@/lib/match-helpers";
import { MatchInfoForm } from "@/components/admin/match-info-form";
import { SegmentEditor } from "@/components/admin/segment-editor";

export const metadata = { title: "Edit Match" };

export default async function AdminMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const match = await getMatchWithDetails(matchId);
  if (!match) notFound();

  const tournament = await getActiveTournament();
  const courses = await getCourses(tournament.id);
  const totals = calculateMatchTotals(match.segments);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href={`/admin/rounds/${match.roundId}`} className="flex items-center gap-1.5 text-sm text-ink-700/60 hover:text-fairway-700">
        <ArrowLeft className="h-4 w-4" />
        Back to {match.round.name}
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">
          {match.isPlayoff ? "Captain Playoff" : `Match ${match.matchNumber}`}
        </h1>
        <p className="mt-1 text-sm text-ink-700/60">
          {getSideNames(match, "A")} vs {getSideNames(match, "B")}
        </p>
        <p className="mt-1 font-display text-xl font-bold text-fairway-800">
          {formatPoints(totals.teamA)} — {formatPoints(totals.teamB)}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">Match Details</h2>
        <MatchInfoForm match={match} courses={courses} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">Scoring</h2>
        <SegmentEditor matchId={match.id} segments={match.segments} />
      </section>
    </div>
  );
}
