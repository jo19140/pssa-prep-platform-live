import "server-only";

import { loadCurrentUserProducts } from "@/lib/auth/currentUserProducts";
import type { Product } from "@/lib/entitlements";

export async function loadCurrentTeacherProducts(): Promise<Product[]> {
  return loadCurrentUserProducts();
}
