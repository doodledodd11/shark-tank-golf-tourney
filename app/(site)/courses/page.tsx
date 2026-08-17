import { getActiveTournament, getCourses, getRoundsWithDetails } from "@/lib/data";
import { isAdminSession } from "@/lib/dal";
import { PageHeader } from "@/components/shared/page-header";
import { CourseCard } from "@/components/courses/course-card";
import { CourseSelectionTool } from "@/components/courses/course-selection-tool";
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
        <h2 className="font-display text-2xl font-bold text-fairway-900">Approved Tournament Courses</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        <div className="mt-14">
          <h2 className="font-display text-2xl font-bold text-fairway-900">Matches Needing a Course</h2>
          <p className="mt-1 text-sm text-ink-700/60">
            Each player selects their preferred course from the approved list. Duplicate picks count as extra
            entries in the random draw. Pick honestly, or don&apos;t be surprised when your favorite course wins.
            Once everyone&apos;s in, the tournament admin runs the draw to lock in the official course.
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
              {matchesNeedingSelection.map(({ match, roundName }) => (
                <CourseSelectionTool
                  key={match.id}
                  matchId={match.id}
                  matchLabel={`${roundName} · Match ${match.matchNumber}`}
                  participants={match.participants.map((p) => ({ playerId: p.playerId, playerName: p.player.name }))}
                  courses={selectableCourses}
                  initialSelections={match.courseSelections.map((s) => ({ playerId: s.playerId, courseId: s.courseId }))}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
