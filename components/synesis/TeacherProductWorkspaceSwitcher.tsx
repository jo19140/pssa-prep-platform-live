import React from "react";
import type { Product, ProductId } from "@/lib/entitlements";
import { ProductWorkspaceSwitcher, type WorkspaceHrefs } from "@/components/synesis/ProductWorkspaceSwitcher";

export type TeacherWorkspaceProduct = Extract<ProductId, "state_track" | "reading_buddy">;

const WORKSPACE_HREFS: WorkspaceHrefs = {
  state_track: "/teacher",
  reading_buddy: "/teacher/literacy",
};

export function TeacherProductWorkspaceSwitcher({
  products,
  activeProduct,
}: {
  products: Product[];
  activeProduct: TeacherWorkspaceProduct;
}) {
  return (
    <ProductWorkspaceSwitcher
      products={products}
      activeProduct={activeProduct}
      workspaceHrefs={WORKSPACE_HREFS}
      ariaLabel="Teacher product workspaces"
    />
  );
}

export function workspaceHrefFor(productId: TeacherWorkspaceProduct): string {
  return WORKSPACE_HREFS[productId] || "/";
}
