"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Flag, Lock, Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Header({ tournamentName }: { tournamentName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold-700/30 bg-fairway-950 text-cream-50 fairway-texture">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/60 bg-fairway-900 text-gold-400 transition-colors group-hover:border-gold-400">
            <Flag className="h-4.5 w-4.5" strokeWidth={2} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-cream-50 sm:text-xl">
            {tournamentName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                  active
                    ? "bg-fairway-900 text-gold-400"
                    : "text-cream-100/85 hover:bg-fairway-900/60 hover:text-cream-50",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/admin"
            className="ml-3 flex items-center gap-1.5 rounded-full border border-cream-50/15 px-3 py-2 text-xs font-medium uppercase tracking-wider text-cream-100/50 transition-colors hover:border-gold-500/50 hover:text-gold-400"
          >
            <Lock className="h-3 w-3" />
            Admin
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-cream-50 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-cream-50/10 bg-fairway-950 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {NAV_LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-base font-medium",
                    active ? "bg-fairway-900 text-gold-400" : "text-cream-100/85 hover:bg-fairway-900/60",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-cream-50/15 px-3 py-2.5 text-sm uppercase tracking-wider text-cream-100/50"
            >
              <Lock className="h-3.5 w-3.5" />
              Admin
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
