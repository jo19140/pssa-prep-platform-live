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
    <main className="p-6">
      <div className="flex justify-end mb-4">
        <LogoutButton />
      </div>

      <AdminDashboardPage />
    </main>
  );
}