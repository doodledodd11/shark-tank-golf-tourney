import { getActiveTournament, getCourses, getRoundsWithDetails } from "@/lib/data";
import { isAdminSession } from "@/lib/dal";
import { PageHeader } from "@/components/shared/page-header";
import { ApprovedCoursesSection } from "@/components/courses/approved-courses-section";
import { CourseSelectionTool } from "@/components/courses/course-selection-tool";
import { MatchCourseStatusCard } from "@/components/courses/match-course-status-card";
import { CourseSelectionDemo } from "@/components/courses/course-selection-demo";
import { EmptyState } from "@/components/shared/empty-state";
import { MapPinned } from "lucide-react";

export const metadata = { title: "Course Selection" };

export default async function CoursesPage() {
  const tournament = await getActiveTournament();
  const [courses, rounds, isAdmin] = await Promise.all([
    getCourses(tournament.id),
    getRoundsWithDetails(tournament.id),
    isAdminSession(),
  ]);

  const selectableCourses = courses.filter((c) => c.active && c.approved);

  const matchesNeedingSelection = rounds.flatMap((r) =>
    r.matches
      .filter((m) => !m.courseId && m.status !== "COMPLETE")
      .map((m) => ({ match: m, roundName: r.name })),
  );

  return (
    <div>
      <PageHeader
        title="Course Selection"
        subtitle="Approved courses for the tournament, and a fair way for four players to agree on one."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ApprovedCoursesSection courses={courses} />

        <div className="mt-14">
          <h2 className="font-display text-2xl font-bold text-fairway-900">Matches Needing a Course</h2>
          <p className="mt-1 text-sm text-ink-700/60">
            Each player picks their preferred course through their own personal link, sent by the tournament
            admin. Duplicate picks count as extra entries in the random draw, so pick honestly. Once
            everyone&apos;s in, the admin runs the draw to lock in the official course.
          </p>

          <div className="mt-6">
            <CourseSelectionDemo courses={selectableCourses} />
          </div>

          {matchesNeedingSelection.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={MapPinned}
                title="Nothing needs a course right now"
                body="Every scheduled match already has a course assigned. Check back once new matchups are set."
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {matchesNeedingSelection.map(({ match, roundName }) =>
                isAdmin ? (
                  <CourseSelectionTool
                    key={match.id}
                    matchId={match.id}
                    matchLabel={`${roundName} · Match ${match.matchNumber}`}
                    participants={match.participants.map((p) => ({ playerId: p.playerId, playerName: p.player.name }))}
                    courses={selectableCourses}
                    initialSelections={match.courseSelections.map((s) => ({ playerId: s.playerId, courseId: s.courseId }))}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <MatchCourseStatusCard
                    key={match.id}
                    matchLabel={`${roundName} · Match ${match.matchNumber}`}
                    participants={match.participants.map((p) => ({ playerId: p.playerId, playerName: p.player.name }))}
                    selectedPlayerIds={new Set(match.courseSelections.map((s) => s.playerId))}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
