import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveProducts, type Product } from "@/lib/entitlements";

export async function loadCurrentUserProducts(): Promise<Product[]> {
  const session = await getServerSession(authOptions);
  const userId = String((session?.user as any)?.id || "");
  if (!userId) return [];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { enrolledPrograms: true, enrolledTestPrep: true },
  });
  return resolveProducts(user);
}
