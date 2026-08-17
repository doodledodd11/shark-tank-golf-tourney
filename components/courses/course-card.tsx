"use client";

import { useState } from "react";
import type { Course } from "@prisma/client";
import { ChevronDown, ExternalLink, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function CourseCard({ course }: { course: Course }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(course.city || course.state || course.priceRange || course.notes || course.website);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm",
        course.active ? "border-fairway-900/10" : "border-stone-200 opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((e) => !e)}
        aria-expanded={expanded}
        disabled={!hasDetails}
        className="flex w-full items-center justify-between gap-2 p-5 text-left disabled:cursor-default"
      >
        <h3 className="font-display text-lg font-bold text-ink-950">{course.name}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {!course.active && (
            <span className="rounded-full bg-stone-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-600">
              Inactive
            </span>
          )}
          {hasDetails && (
            <ChevronDown className={cn("h-4 w-4 text-ink-700/40 transition-transform", expanded && "rotate-180")} />
          )}
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="px-5 pb-5">
          {(course.city || course.state) && (
            <p className="flex items-center gap-1.5 text-sm text-ink-700/60">
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
      )}
    </div>
  );
}
