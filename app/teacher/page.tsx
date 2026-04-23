import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { TeacherDashboardPage } from "@/components/TeacherDashboardPage";

export default async function TeacherPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") redirect("/dashboard");
  return <main className="p-6"><TeacherDashboardPage /></main>;
}
