import { redirect } from "next/navigation";

export default async function TeacherPssaInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  const resolvedSearchParams = await searchParams;
  for (const [key, value] of Object.entries(resolvedSearchParams ?? {})) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  params.set("tab", "reports");
  redirect(`/teacher?${params.toString()}`);
}
