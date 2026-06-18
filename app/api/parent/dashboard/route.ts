import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadParentDashboard } from "@/lib/parent/loadParentDashboard";
import { toParentDashboardViewData } from "@/lib/parent/parentDashboardViewModel";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "PARENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const dashboard = await loadParentDashboard(String((session.user as any).id));
  if (dashboard.status === "parent_not_found") return NextResponse.json({ error: "Parent profile not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  return NextResponse.json(
    toParentDashboardViewData(dashboard),
    { headers: { "Cache-Control": "no-store" } },
  );
}
