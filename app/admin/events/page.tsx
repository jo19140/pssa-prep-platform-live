import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EventExplorerPage } from "@/components/admin/events/EventExplorerPage";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminEventsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const params = (await searchParams) || {};
  const eventType = typeof params.eventType === "string" ? params.eventType : "";
  const events = await db.studentEvent.findMany({
    where: eventType ? { eventType } : undefined,
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { modelDecisions: { select: { id: true } } },
  });
  return <EventExplorerPage events={events} />;
}
