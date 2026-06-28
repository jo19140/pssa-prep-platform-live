import Link from "next/link";
import { getServerSession } from "next-auth";
import { TeacherReadingCoachPanel } from "@/components/literacy/TeacherReadingCoachPanel";
import { SynesisPageShell } from "@/components/synesis/SynesisPageShell";
import { TeacherProductWorkspaceSwitcher } from "@/components/synesis/TeacherProductWorkspaceSwitcher";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadCurrentTeacherProducts } from "@/lib/teacher/loadCurrentTeacherProducts";

async function TeacherReadingCoachData() {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  const teacher = await db.teacherProfile.findUnique({
    where: { userId },
    include: {
      classes: { include: { enrollments: { include: { studentProfile: { include: { user: true } } } } } },
    },
  });

  const classes = (teacher?.classes || []).map((classRoom) => ({
    id: classRoom.id,
    name: classRoom.name,
    grade: classRoom.grade,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/teacher/literacy" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
        ← Literacy monitor
      </Link>
      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Reading Buddy</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">Reading Coach — assign read-aloud practice</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Assign a teacher-selected read-aloud passage for fluency practice.
        </p>
      </div>
      <div className="mt-6">
        <TeacherReadingCoachPanel classes={classes} />
      </div>
    </main>
  );
}

export default async function TeacherReadingCoachPage() {
  const products = await loadCurrentTeacherProducts();

  return (
    <SynesisPageShell
      roles={["TEACHER"]}
      variant="product"
      homeHref="/teacher"
      productNavigation={<TeacherProductWorkspaceSwitcher products={products} activeProduct="reading_buddy" />}
    >
      <TeacherReadingCoachData />
    </SynesisPageShell>
  );
}
