import type { Product } from "@/lib/entitlements";
import type { WorkspaceHrefs } from "@/components/synesis/ProductWorkspaceSwitcher";

export const STUDENT_WORKSPACE_HREFS: WorkspaceHrefs = {
  state_track: "/student",
  reading_buddy: "/student/practice",
};

export function resolveStudentHomeHref(products: readonly Product[]): string {
  if (products.some((product) => product.id === "state_track" && product.status === "live")) return "/student";
  if (products.some((product) => product.id === "reading_buddy" && product.status === "live")) return "/student/practice";
  return "/student";
}
