import { getActiveTournament, getCourses } from "@/lib/data";
import { AddCourseForm } from "@/components/admin/add-course-form";
import { CourseRow } from "@/components/admin/course-row";

export const metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  const tournament = await getActiveTournament();
  const courses = await getCourses(tournament.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Courses</h1>
      <p className="mt-1 text-sm text-ink-700/60">
        Manage the approved course list. Inactive courses stay visible in history but can&apos;t be selected for new
        matches.
      </p>

      <div className="mt-6">
        <AddCourseForm tournamentId={tournament.id} />
      </div>

      <div className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
        {courses.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-700/50">No courses yet — add one above.</p>
        ) : (
          courses.map((course) => <CourseRow key={course.id} course={course} />)
        )}
      </div>
    </div>
  );
}
