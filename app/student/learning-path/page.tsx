import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StudentLearningPathWindowPage } from "@/components/StudentLearningPathWindowPage";

export default async function StudentLearningPathRoute() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-slate-950">
      <StudentLearningPathWindowPage />
    </main>
  );
}
