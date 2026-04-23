import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ParentDashboardPage } from "@/components/ParentDashboardPage";

export default async function ParentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "PARENT" && role !== "ADMIN") redirect("/dashboard");
  return <main className="p-6"><ParentDashboardPage /></main>;
}
