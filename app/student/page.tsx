import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import { StudentSessionPage } from "@/components/StudentSessionPage";

export default async function StudentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex justify-end">
          <LogoutButton />
        </div>
        <StudentSessionPage />
      </div>
    </main>
  );
}
