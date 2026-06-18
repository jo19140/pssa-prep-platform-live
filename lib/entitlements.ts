import type { SynesisProgram, TestPrepModule } from "@prisma/client";

export type EntitlementInput = {
  enrolledPrograms?: readonly SynesisProgram[] | null;
  enrolledTestPrep?: readonly TestPrepModule[] | null;
};

export type ProductId = "state_track" | "reading_buddy";
export type ActiveProduct = "all" | ProductId;
export type Product = { id: ProductId; label: string };

const STATE_TRACK_PRODUCT: Product = { id: "state_track", label: "State Track" };
const READING_BUDDY_PRODUCT: Product = { id: "reading_buddy", label: "Reading Buddy" };

export function resolveProducts(input: EntitlementInput | null | undefined): Product[] {
  const products: Product[] = [];
  if (input?.enrolledTestPrep?.length) products.push(STATE_TRACK_PRODUCT);
  if (input?.enrolledPrograms?.length) products.push(READING_BUDDY_PRODUCT);
  return products;
}

export function resolveParentProducts(children: readonly EntitlementInput[]): Product[] {
  return [
    children.some(childHasStateTrack) ? STATE_TRACK_PRODUCT : null,
    children.some(childHasReadingBuddy) ? READING_BUDDY_PRODUCT : null,
  ].filter((product): product is Product => Boolean(product));
}

export function childHasStateTrack(input: EntitlementInput | null | undefined): boolean {
  return resolveProducts(input).some((product) => product.id === "state_track");
}

export function childHasReadingBuddy(input: EntitlementInput | null | undefined): boolean {
  return resolveProducts(input).some((product) => product.id === "reading_buddy");
}
