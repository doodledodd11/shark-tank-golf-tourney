import { AdminNav } from "@/components/admin/admin-nav";
import { getActiveTournament } from "@/lib/data";

export const metadata = { title: "Admin" };

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const tournament = await getActiveTournament();

  return (
    <div className="min-h-screen bg-stone-100">
      <AdminNav tournamentName={tournament.name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
