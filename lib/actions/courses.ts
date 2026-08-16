"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/dal";

export interface FormState {
  error?: string;
  success?: boolean;
}

function optionalText(value: FormDataEntryValue | null): string | null {
  const s = value == null ? "" : String(value).trim();
  return s === "" ? null : s;
}

// Rendered directly as an <a href> on the public course list — restricting
// to http/https (rather than accepting any string) keeps a compromised or
// mistyped admin submission from becoming a javascript: URL.
const websiteSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Website must start with http:// or https://")
  .optional();

const courseSchema = z.object({
  name: z.string().trim().min(1, "Course name is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  website: websiteSchema,
  priceRange: z.string().optional(),
  notes: z.string().optional(),
});

function revalidateCoursePages() {
  revalidatePath("/courses");
  revalidatePath("/", "layout");
}

export async function createCourse(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const tournamentId = String(formData.get("tournamentId") ?? "");
  if (!tournamentId) return { error: "Missing tournament." };

  const parsed = courseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.course.create({
    data: {
      tournamentId,
      name: parsed.data.name,
      city: optionalText(formData.get("city")),
      state: optionalText(formData.get("state")),
      website: parsed.data.website || null,
      priceRange: optionalText(formData.get("priceRange")),
      notes: optionalText(formData.get("notes")),
      approved: true,
      active: true,
    },
  });

  revalidateCoursePages();
  return { success: true };
}

const updateSchema = courseSchema.extend({ id: z.string().min(1) });

export async function updateCourse(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdminSession();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await prisma.course.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      city: optionalText(formData.get("city")),
      state: optionalText(formData.get("state")),
      website: parsed.data.website || null,
      priceRange: optionalText(formData.get("priceRange")),
      notes: optionalText(formData.get("notes")),
    },
  });

  revalidateCoursePages();
  return { success: true };
}

export async function toggleCourseActive(courseId: string, active: boolean): Promise<void> {
  await requireAdminSession();
  await prisma.course.update({ where: { id: courseId }, data: { active } });
  revalidateCoursePages();
}

export async function deleteCourse(courseId: string): Promise<void> {
  await requireAdminSession();
  // Match.courseId is ON DELETE SET NULL (a match shouldn't vanish just
  // because its course did), so Postgres won't stop this delete on its own
  // if a match still references the course — check explicitly instead.
  // CourseSelection.courseId *is* still a genuine RESTRICT, so the catch
  // below remains a real (if secondary) safety net for that case.
  const referencingMatch = await prisma.match.findFirst({ where: { courseId } });
  if (referencingMatch) {
    throw new Error("Can't delete a course already linked to a match — mark it inactive instead.");
  }
  try {
    await prisma.course.delete({ where: { id: courseId } });
  } catch {
    throw new Error("Can't delete a course that players have already selected for a match.");
  }
  revalidateCoursePages();
}
