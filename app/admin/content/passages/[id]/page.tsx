import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PassageReviewWorkspace } from "@/components/admin/content/PassageReviewWorkspace";
import { authOptions } from "@/lib/auth";
import { getPassageForReview } from "@/lib/literacy/passageReview";

export default async function AdminPassageReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/dashboard");

  const passage = await getPassageForReview((await params).id);
  if (!passage) redirect("/admin/content/passages/queue");

  return <PassageReviewWorkspace passage={JSON.parse(JSON.stringify(passage))} />;
}
