"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, LogOut, Menu, Shield, X } from "lucide-react";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function AdminNav({ tournamentName }: { tournamentName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-700/60 bg-ink-950 text-cream-50">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-500/50 text-gold-400">
            <Shield className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-cream-50">Admin</p>
            <p className="hidden text-xs text-cream-100/40 sm:block">{tournamentName}</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {ADMIN_NAV_LINKS.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-gold-500 text-ink-950" : "text-cream-100/70 hover:bg-ink-800 hover:text-cream-50",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 rounded-full border border-cream-50/15 px-3 py-1.5 text-xs font-medium text-cream-100/60 hover:text-cream-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Site
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full border border-cream-50/15 px-3 py-1.5 text-xs font-medium text-cream-100/60 hover:border-red-400/40 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-cream-50 md:hidden"
          aria-label={open ? "Close admin menu" : "Open admin menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-700/60 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {ADMIN_NAV_LINKS.map((link) => {
              const active = link.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-base font-medium",
                    active ? "bg-gold-500 text-ink-950" : "text-cream-100/70 hover:bg-ink-800",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/" target="_blank" className="mt-2 rounded-lg border border-cream-50/15 px-3 py-2.5 text-sm text-cream-100/60">
              View Public Site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="mt-1 w-full rounded-lg border border-cream-50/15 px-3 py-2.5 text-left text-sm text-cream-100/60">
                Log Out
              </button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
