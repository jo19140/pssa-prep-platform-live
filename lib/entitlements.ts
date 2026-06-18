import type { SynesisProgram, TestPrepModule } from "@prisma/client";

export type EntitlementInput = {
  enrolledPrograms?: readonly SynesisProgram[] | null;
  enrolledTestPrep?: readonly TestPrepModule[] | null;
};

export type ProductId = "state_track" | "reading_buddy" | "math_buddy" | "science_buddy" | "history_buddy";
export type ActiveProduct = "all" | ProductId;
export type Product = { id: ProductId; label: string; mascot?: string; status: "live" | "coming_soon" };

const STATE_TRACK_PRODUCT: Product = { id: "state_track", label: "State Track", status: "live" };

export const PROGRAM_PRODUCTS = {
  VENUS: { id: "reading_buddy", label: "Reading Buddy", mascot: "Harper", status: "live" },
  MERCURY: { id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" },
  MARS: { id: "science_buddy", label: "Science Buddy", status: "coming_soon" },
  EARTH: { id: "history_buddy", label: "History Buddy", status: "coming_soon" },
} as const satisfies Record<SynesisProgram, Product>;

const PRODUCT_ORDER: ProductId[] = ["state_track", "reading_buddy", "math_buddy", "science_buddy", "history_buddy"];

export function resolveProducts(input: EntitlementInput | null | undefined): Product[] {
  const products: Product[] = [];
  if (input?.enrolledTestPrep?.length) products.push(STATE_TRACK_PRODUCT);
  for (const program of input?.enrolledPrograms ?? []) products.push(PROGRAM_PRODUCTS[program]);
  return dedupeAndSortProducts(products);
}

export function resolveParentProducts(children: readonly EntitlementInput[]): Product[] {
  return dedupeAndSortProducts(children.flatMap((child) => resolveProducts(child)));
}

export function childHasStateTrack(input: EntitlementInput | null | undefined): boolean {
  return Boolean(input?.enrolledTestPrep?.length);
}

export function childHasReadingBuddy(input: EntitlementInput | null | undefined): boolean {
  return Boolean(input?.enrolledPrograms?.includes("VENUS"));
}

export function normalizeActiveProduct(raw: string | null | undefined, products: readonly Product[]): ActiveProduct {
  if (raw === "all") return "all";
  const requested = products.find((product) => product.id === raw);
  return requested?.status === "live" ? requested.id : "all";
}

function dedupeAndSortProducts(products: readonly Product[]): Product[] {
  const byId = new Map<ProductId, Product>();
  for (const product of products) {
    if (!byId.has(product.id)) byId.set(product.id, product);
  }
  return PRODUCT_ORDER.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
}
