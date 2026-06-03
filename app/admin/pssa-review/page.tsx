import { redirect } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { PssaReviewWorkspace } from "@/components/admin/pssa/PssaReviewWorkspace";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminPssaReviewPage() {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) redirect("/dashboard");
  return <PssaReviewWorkspace />;
}
