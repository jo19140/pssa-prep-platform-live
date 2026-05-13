import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import LogoutButton from "@/components/LogoutButton";
import TeacherReviewEditorPage from "@/components/TeacherReviewEditorPage";
import { authOptions } from "@/lib/auth";

export default async function TeacherReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") redirect("/");
  const { id } = await params;
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-500">Mastery Platform</p>
            <h1 className="text-xl font-bold text-slate-950">Lesson Review</h1>
          </div>
          <LogoutButton />
        </div>
      </div>
      <TeacherReviewEditorPage reviewId={id} />
    </main>
  );
}
