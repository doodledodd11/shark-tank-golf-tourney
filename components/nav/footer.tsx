import Link from "next/link";
import { Flag } from "lucide-react";
import { NAV_LINKS } from "@/lib/nav";

export function Footer({ tournamentName, season }: { tournamentName: string; season: number }) {
  return (
    <footer className="border-t border-fairway-900/10 bg-ink-950 text-cream-100/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-500/50 text-gold-400">
              <Flag className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-base font-semibold text-cream-50">{tournamentName}</p>
              <p className="mt-1 max-w-xs text-sm text-cream-100/50">
                A member-run, tiered match-play championship for the club — {season} season.
              </p>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:flex sm:gap-8">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-cream-100/60 hover:text-gold-400">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-cream-50/10 pt-6 text-xs text-cream-100/40 sm:flex-row sm:items-center sm:justify-between">
          <p>No handicap strokes. No mercy. Draft wisely.</p>
          <p>
            Official results live here — live shot-by-shot scoring, when linked, is provided by third-party
            scoring apps.
          </p>
        </div>
      </div>
    </footer>
  );
}
