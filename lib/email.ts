// Thin wrapper around Resend for the one transactional email this site
// sends: a player's personal course-selection link. Kept isolated here so
// the rest of the app never touches the Resend SDK directly, and so a
// missing/invalid API key fails as a clear, catchable error instead of a
// crash — the feature (per-player links) still works without email
// configured, an admin just has to copy/share links manually instead.

import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

/** The site's own absolute origin, for building links inside emails —
 * there's no request/window to read this from server-side, so it's built
 * from whichever of these env vars is actually set. Prefers a custom
 * domain if configured, then Vercel's stable production URL, then
 * whatever deployment URL is currently building, then localhost. */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendCourseSelectionEmail(input: {
  to: string;
  playerName: string;
  matchLabel: string;
  link: string;
}): Promise<{ error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { error: "Email isn't configured yet. Set RESEND_API_KEY to enable sending." };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: input.to,
      subject: `Pick your course, ${input.matchLabel}`,
      html: `
        <p>Hi ${input.playerName},</p>
        <p>It's time to pick your preferred course for <strong>${input.matchLabel}</strong>.</p>
        <p><a href="${input.link}">Make your selection</a></p>
        <p style="color:#666;font-size:13px;">This link is yours alone, no account needed.</p>
      `,
    });
    if (result.error) return { error: result.error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't send that email." };
  }
}
