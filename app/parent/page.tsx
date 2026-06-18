import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ParentDashboardPage } from "@/components/ParentDashboardPage";
import { ProductSwitcher } from "@/components/synesis/ProductSwitcher";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { normalizeActiveProduct } from "@/components/synesis/ProductSwitcher";
import { loadParentDashboard } from "@/lib/parent/loadParentDashboard";
import { toParentDashboardViewData } from "@/lib/parent/parentDashboardViewModel";

export const dynamic = "force-dynamic";

export default async function ParentPage({
  searchParams,
}: {
  searchParams?: Promise<{ product?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "PARENT" && role !== "ADMIN") redirect("/dashboard");
  const dashboard = await loadParentDashboard(String((session.user as any).id));
  if (dashboard.status === "parent_not_found") redirect("/dashboard");
  const resolvedSearchParams = await searchParams;
  const activeProduct = normalizeActiveProduct(Array.isArray(resolvedSearchParams?.product)
    ? resolvedSearchParams?.product[0]
    : resolvedSearchParams?.product);
  const viewData = JSON.parse(JSON.stringify(toParentDashboardViewData(dashboard)));

  return (
    <SynesisPageShell
      roles={["PARENT"]}
      variant="product"
      homeHref="/parent"
      productNavigation={<ProductSwitcher products={viewData.products} activeProduct={activeProduct} />}
    >
      <main className="p-6">
        <ParentDashboardPage initialData={viewData} activeProduct={activeProduct} />
      </main>
    </SynesisPageShell>
  );
}
