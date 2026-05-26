import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { SynesisHeader } from "@/components/synesis/SynesisHeader";

export async function SynesisPageShell({
  children,
  roles,
}: {
  children: ReactNode;
  roles: string[];
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = String((session.user as any).role);
  if (!roles.includes(role) && role !== "ADMIN") redirect("/dashboard");
  const user = await db.user.findUnique({
    where: { id: String((session.user as any).id) },
    select: {
      enrolledPrograms: true,
      enrolledTestPrep: true,
      createdAt: true,
    },
  });
  return (
    <div className="min-h-screen bg-slate-50">
      <SynesisHeader
        enrolledPrograms={user?.enrolledPrograms}
        enrolledTestPrep={user?.enrolledTestPrep}
      />
      {children}
    </div>
  );
}
