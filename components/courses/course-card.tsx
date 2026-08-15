import type { Course } from "@prisma/client";
import { ExternalLink, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function CourseCard({ course }: { course: Course }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm",
        course.active ? "border-fairway-900/10" : "border-stone-200 opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-ink-950">{course.name}</h3>
        {!course.active && (
          <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-600">
            Inactive
          </span>
        )}
      </div>

      {(course.city || course.state) && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700/60">
          <MapPin className="h-3.5 w-3.5" />
          {[course.city, course.state].filter(Boolean).join(", ")}
        </p>
      )}

      {course.priceRange && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-700/60">
          <Tag className="h-3.5 w-3.5" />
          {course.priceRange}
        </p>
      )}

      {course.notes && <p className="mt-3 text-sm leading-relaxed text-ink-700/70">{course.notes}</p>}

      {course.website && (
        <a
          href={course.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-fairway-700 hover:text-fairway-900"
        >
          Visit website
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
