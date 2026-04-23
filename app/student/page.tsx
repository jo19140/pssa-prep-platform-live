import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StudentSessionPage } from "@/components/StudentSessionPage";

export default async function StudentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") redirect("/dashboard");
  return <main className="p-6"><StudentSessionPage /></main>;
}
