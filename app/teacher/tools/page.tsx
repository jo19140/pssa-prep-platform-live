import { redirect } from "next/navigation";
import TeacherDashboardPage from "@/components/TeacherDashboardPage";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { TeacherProductWorkspaceSwitcher } from "@/components/synesis/TeacherProductWorkspaceSwitcher";
import { loadCurrentTeacherProducts } from "@/lib/teacher/loadCurrentTeacherProducts";

export default async function TeacherToolsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const products = await loadCurrentTeacherProducts();
  const resolvedSearchParams = await searchParams;
  const activeTab = firstValue(resolvedSearchParams?.tab);

  if (activeTab === "classes" || activeTab === "import") {
    redirect("/teacher?tab=classes");
  }
  if (activeTab === "readingCoach") {
    redirect("/teacher/literacy/reading-coach");
  }

  return (
    <SynesisPageShell
      roles={["TEACHER"]}
      variant="product"
      homeHref="/teacher"
      productNavigation={<TeacherProductWorkspaceSwitcher products={products} activeProduct="state_track" />}
    >
      <main className="p-6">
        <TeacherDashboardPage />
      </main>
    </SynesisPageShell>
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
