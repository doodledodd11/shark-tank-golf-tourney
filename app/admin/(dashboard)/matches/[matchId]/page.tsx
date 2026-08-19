import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getActiveTournament, getCourses, getMatchWithDetails } from "@/lib/data";
import { calculateMatchTotals } from "@/lib/tournament-logic";
import { formatPoints } from "@/lib/format";
import { getSideNames } from "@/lib/match-helpers";
import { MatchInfoForm } from "@/components/admin/match-info-form";
import { SegmentEditor } from "@/components/admin/segment-editor";
import { CourseSelectionLinksPanel } from "@/components/admin/course-selection-links-panel";
import { ScorecardLinksPanel } from "@/components/admin/scorecard-links-panel";

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
          {match.teamA?.name ?? "Team A"} {formatPoints(totals.teamA)}, {match.teamB?.name ?? "Team B"}{" "}
          {formatPoints(totals.teamB)}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">Match Details</h2>
        <MatchInfoForm match={match} courses={courses} />
      </section>

      {!match.courseId && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">Course Selection</h2>
          <CourseSelectionLinksPanel
            matchId={match.id}
            participants={match.participants.map((p) => ({
              playerId: p.playerId,
              playerName: p.player.name,
              accessToken: p.accessToken,
              hasEmail: Boolean(p.player.email),
            }))}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">Scorecard</h2>
        <ScorecardLinksPanel
          matchId={match.id}
          sides={[
            {
              side: "A",
              names: getSideNames(match, "A"),
              accessToken: match.teamASideAccessToken,
              hasEmail: match.participants.some((p) => p.side === "A" && p.player.email),
            },
            {
              side: "B",
              names: getSideNames(match, "B"),
              accessToken: match.teamBSideAccessToken,
              hasEmail: match.participants.some((p) => p.side === "B" && p.player.email),
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-700/50">Scoring</h2>
        <SegmentEditor matchId={match.id} segments={match.segments} />
      </section>
    </div>
  );
}
