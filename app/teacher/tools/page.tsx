import TeacherDashboardPage from "@/components/TeacherDashboardPage";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { TeacherProductWorkspaceSwitcher } from "@/components/synesis/TeacherProductWorkspaceSwitcher";
import { loadCurrentTeacherProducts } from "@/lib/teacher/loadCurrentTeacherProducts";

export default async function TeacherToolsPage() {
  const products = await loadCurrentTeacherProducts();

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
