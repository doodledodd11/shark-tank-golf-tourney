"use client";

import { useState } from "react";
import type { Course } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import { CourseCard } from "@/components/courses/course-card";
import { cn } from "@/lib/utils";

export function ApprovedCoursesSection({ courses }: { courses: Course[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex items-center gap-2"
      >
        <h2 className="font-display text-2xl font-bold text-fairway-900">Approved Tournament Courses</h2>
        <ChevronDown className={cn("h-5 w-5 text-ink-700/40 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
