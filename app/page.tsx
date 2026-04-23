import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role === "ADMIN") redirect("/admin");
  if (role === "TEACHER") redirect("/teacher");
  if (role === "STUDENT") redirect("/student");
  if (role === "PARENT") redirect("/parent");

  redirect("/login");
}
