import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import LogoutButton from "@/components/LogoutButton";
import { authOptions } from "@/lib/auth";

const adminGroups = [
  {
    title: "PSSA Review",
    links: [
      { href: "/admin/pssa-review", label: "Review queue" },
      { href: "/admin/pssa-preview", label: "Preview content" },
    ],
  },
  {
    title: "Content Review",
    links: [
      { href: "/admin/content/diagnostic-items/queue", label: "Diagnostic items" },
      { href: "/admin/content/passages/queue", label: "Passages" },
    ],
  },
  {
    title: "Data Flywheel",
    links: [
      { href: "/admin/data-flywheel/exports", label: "Exports" },
      { href: "/admin/data-flywheel/model-comparison", label: "Model comparison" },
    ],
  },
  {
    title: "Voice",
    links: [
      { href: "/admin/voice/labeling", label: "Labeling queue" },
      { href: "/admin/voice/eval-set", label: "Evaluation set" },
      { href: "/admin/voice/exports", label: "Exports" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/admin/decisions", label: "Decisions" },
      { href: "/admin/events", label: "Events" },
      { href: "/admin/compliance", label: "Compliance" },
      { href: "/admin/grade-test", label: "Grade essay test" },
    ],
  },
];

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-500">Sý Learning</p>
            <h1 className="text-xl font-bold text-slate-950">Admin</h1>
          </div>
          <LogoutButton />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminGroups.map((group) => (
            <section key={group.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">{group.title}</h2>
              <div className="mt-4 grid gap-2">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
