import { redirect } from "next/navigation";

export default async function TeacherToolsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeTab = firstValue(resolvedSearchParams?.tab);

  if (activeTab === "classes" || activeTab === "import") {
    redirect("/teacher?tab=classes");
  }
  if (activeTab === "readingCoach") {
    redirect("/teacher/literacy/reading-coach");
  }
  redirect("/teacher?tab=resources");
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
