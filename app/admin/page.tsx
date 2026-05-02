import LogoutButton from "@/components/LogoutButton";
import AdminDashboardPage from "@/components/AdminDashboardPage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Only check if user is logged in (prevents redirect loop)
  if (!session?.user) redirect("/login");

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-500">PSSA Platform</p>
            <h1 className="text-xl font-bold text-slate-950">Admin</h1>
          </div>
          <LogoutButton />
        </div>
      </div>

      <AdminDashboardPage />
    </main>
  );
}
