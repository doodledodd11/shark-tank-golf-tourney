import { Header } from "@/components/nav/header";
import { Footer } from "@/components/nav/footer";
import { getActiveTournament } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tournament = await getActiveTournament();

  return (
    <div className="flex min-h-screen flex-col">
      <Header tournamentName={tournament.name} />
      <main className="flex-1">{children}</main>
      <Footer tournamentName={tournament.name} season={tournament.season} />
    </div>
  );
}
