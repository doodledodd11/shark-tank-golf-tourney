import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getActiveTournament } from "@/lib/data";

// Prisma reads aren't a Next.js "dynamic API" the way cookies()/headers()
// are, so without this, `next build` would happily prerender pages once at
// build time and freeze that snapshot — silently hiding every admin edit
// made afterward. This is a low-traffic site where correctness matters far
// more than shaving a static-render's worth of latency, so the whole app
// (set here, at the true root) renders fresh on every request instead.
export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["600", "700", "800", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tournament = await getActiveTournament();
  return {
    title: {
      default: tournament.name,
      template: `%s | ${tournament.name}`,
    },
    description: tournament.subtitle,
  };
}

export const viewport: Viewport = {
  themeColor: "#0d2e21",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-cream-50 font-sans text-ink-950 antialiased">{children}</body>
    </html>
  );
}
