import Link from "next/link";
import Image from "next/image";
import { Flag, ScrollText, Users } from "lucide-react";
import { TOURNAMENT_STATUS_LABELS, type TournamentStatus } from "@/lib/constants";
import { HOST_CLUB } from "@/lib/site-config";

export function Hero({
  name,
  subtitle,
  status,
}: {
  name: string;
  subtitle: string;
  status: TournamentStatus;
}) {
  return (
    <section className="relative overflow-hidden bg-fairway-950 fairway-texture">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(201,162,39,0.18) 0%, rgba(201,162,39,0) 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-fairway-900/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
          <Flag className="h-3.5 w-3.5" />
          {TOURNAMENT_STATUS_LABELS[status]}
        </span>

        <h1 className="mt-6 text-balance font-display text-4xl font-bold leading-[1.05] text-cream-50 sm:text-6xl lg:text-7xl">
          {name}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-cream-100/80 sm:text-xl">{subtitle}</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/players"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3 font-semibold text-fairway-950 transition-colors hover:bg-gold-400 sm:w-auto"
          >
            <Users className="h-4 w-4" />
            Meet the Field
          </Link>
          <Link
            href="/rules"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-cream-50/25 px-6 py-3 font-semibold text-cream-50 transition-colors hover:border-cream-50/50 hover:bg-cream-50/5 sm:w-auto"
          >
            <ScrollText className="h-4 w-4" />
            Read the Rules
          </Link>
        </div>

        <a
          href={HOST_CLUB.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-12 inline-flex items-center gap-3 text-sm text-cream-100/50 transition-colors hover:text-cream-100/80"
        >
          Hosted by
          <span className="flex items-center rounded-md bg-cream-50 px-2.5 py-1.5 shadow-sm transition-transform group-hover:scale-[1.04]">
            <Image
              src={HOST_CLUB.logoSrc}
              alt={HOST_CLUB.name}
              width={HOST_CLUB.logoWidth}
              height={HOST_CLUB.logoHeight}
              className="h-8 w-auto"
            />
          </span>
        </a>
      </div>
    </section>
  );
}
