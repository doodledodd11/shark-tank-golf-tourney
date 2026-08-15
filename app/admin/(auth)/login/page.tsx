import { Flag } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Admin Login" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-fairway-950 fairway-texture px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-gold-700/30 bg-fairway-900/40 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/60 text-gold-400">
            <Flag className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-cream-50">Tournament Admin</h1>
          <p className="mt-1 text-sm text-cream-100/50">Sign in to manage players, matches, and results.</p>
        </div>
        <LoginForm from={from ?? "/admin"} />
      </div>
    </div>
  );
}
