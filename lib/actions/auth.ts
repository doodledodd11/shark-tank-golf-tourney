"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  checkAdminPassword,
  createSessionToken,
} from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  const from = formData.get("from");
  const redirectTo = typeof from === "string" && from.startsWith("/admin") && from !== "/admin/login" ? from : "/admin";

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter the admin password." };
  }

  if (!checkAdminPassword(password)) {
    return { error: "Incorrect password." };
  }

  const token = await createSessionToken();
  (await cookies()).set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/admin/login");
}
