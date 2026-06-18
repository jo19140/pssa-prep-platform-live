import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { loadCurrentUserProducts } from "@/lib/auth/currentUserProducts";
import { StudentSessionPage } from "@/components/StudentSessionPage";
import { ProductWorkspaceSwitcher } from "@/components/synesis/ProductWorkspaceSwitcher";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { resolveStudentHomeHref, STUDENT_WORKSPACE_HREFS } from "@/lib/student/studentWorkspace";

export default async function StudentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") redirect("/dashboard");
  const products = await loadCurrentUserProducts();

  return (
    <SynesisPageShell
      roles={["STUDENT"]}
      variant="product"
      homeHref={resolveStudentHomeHref(products)}
      productNavigation={
        <ProductWorkspaceSwitcher
          products={products}
          activeProduct="state_track"
          workspaceHrefs={STUDENT_WORKSPACE_HREFS}
          ariaLabel="Student product workspaces"
        />
      }
    >
      <main className="min-h-screen bg-slate-100 p-6 md:p-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <StudentSessionPage />
        </div>
      </main>
    </SynesisPageShell>
  );
}
