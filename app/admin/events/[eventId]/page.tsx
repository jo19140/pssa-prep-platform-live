import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EventDetailPage } from "@/components/admin/events/EventExplorerPage";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");
  const event = await db.studentEvent.findUnique({
    where: { id: (await params).eventId },
    include: { outcomes: true, modelDecisions: { include: { outcomes: true, childDecisions: true } } },
  });
  if (!event) redirect("/admin/events");
  return <EventDetailPage event={event} />;
}
