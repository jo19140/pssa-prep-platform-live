import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  childHasReadingBuddy,
  childHasStateTrack,
  normalizeActiveProduct,
  resolveParentProducts,
  resolveProducts,
} from "../../lib/entitlements";
import { createParentDashboardLoader } from "../../lib/parent/parentDashboardLoaderCore";

async function main() {
  assert.deepEqual(resolveProducts(null), []);
  assert.deepEqual(resolveProducts({ enrolledPrograms: null, enrolledTestPrep: null }), []);
  assert.deepEqual(resolveProducts({ enrolledPrograms: [], enrolledTestPrep: [] }), []);
  assert.deepEqual(
    resolveProducts({ enrolledPrograms: ["VENUS", "MARS"], enrolledTestPrep: ["PSSA"] }).map((product) => product.id),
    ["state_track", "reading_buddy", "science_buddy"],
  );
  assert.deepEqual(
    resolveProducts({ enrolledPrograms: ["MERCURY", "MERCURY"], enrolledTestPrep: [] }),
    [{ id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" }],
  );
  assert.deepEqual(
    resolveParentProducts([
      { enrolledPrograms: ["VENUS"], enrolledTestPrep: [] },
      { enrolledPrograms: [], enrolledTestPrep: ["PSSA"] },
      { enrolledPrograms: ["MARS"], enrolledTestPrep: ["STAAR"] },
    ]).map((product) => product.id),
    ["state_track", "reading_buddy", "science_buddy"],
  );
  assert.deepEqual(
    resolveParentProducts([
      { enrolledPrograms: ["MARS"], enrolledTestPrep: ["STAAR"] },
      { enrolledPrograms: ["VENUS"], enrolledTestPrep: [] },
      { enrolledPrograms: [], enrolledTestPrep: ["PSSA"] },
    ]).map((product) => product.id),
    ["state_track", "reading_buddy", "science_buddy"],
  );
  assert.equal(childHasStateTrack({ enrolledTestPrep: ["PSSA"] }), true);
  assert.equal(childHasStateTrack({ enrolledTestPrep: [] }), false);
  assert.equal(childHasReadingBuddy({ enrolledPrograms: ["VENUS"] }), true);
  assert.equal(childHasReadingBuddy({ enrolledPrograms: ["MERCURY"] }), false);
  assert.equal(childHasReadingBuddy({ enrolledPrograms: [] }), false);
  const mixedProducts = resolveProducts({ enrolledPrograms: ["VENUS", "MERCURY"], enrolledTestPrep: ["PSSA"] });
  assert.equal(normalizeActiveProduct("all", mixedProducts), "all");
  assert.equal(normalizeActiveProduct("reading_buddy", mixedProducts), "reading_buddy");
  assert.equal(normalizeActiveProduct("math_buddy", mixedProducts), "all");
  assert.equal(normalizeActiveProduct("reading_buddy", [{ id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" }]), "all");

  const deniedLoader = createParentDashboardLoader({
    loadParentIdentity: async () => null,
    loadLinkedChildren: async () => {
      throw new Error("must not load children when role gate fails");
    },
    loadStateTrack: async () => "state",
    loadReadingBuddy: async () => "reading",
  });
  assert.deepEqual(await deniedLoader("not-parent"), { status: "parent_not_found" });

  const calls: string[] = [];
  const loader = createParentDashboardLoader({
    loadParentIdentity: async (userId) => (userId === "parent-user" ? { parentProfileId: "parent-profile" } : null),
    loadLinkedChildren: async (parentProfileId) => {
      assert.equal(parentProfileId, "parent-profile");
      return [
        child("sp-b", "user-b", "Zoey", 4, ["VENUS"], ["PSSA"]),
        child("sp-a", "user-a", "amy", 3, [], ["PSSA"]),
        child("sp-b", "user-b-dupe", "Duplicate", 5, ["MARS"], ["STAAR"]),
        child("sp-c", "user-c", "Ben", null, ["VENUS"], []),
        child("sp-d", "user-d", "Cal", 3, ["MERCURY"], []),
      ];
    },
    loadStateTrack: async (linkedChild) => {
      calls.push(`state:${linkedChild.studentProfileId}`);
      if (linkedChild.studentProfileId === "sp-a") throw new Error("state source down");
      return { source: "state", userId: linkedChild.studentUserId };
    },
    loadReadingBuddy: async (linkedChild) => {
      calls.push(`reading:${linkedChild.studentProfileId}`);
      if (linkedChild.studentProfileId === "sp-c") throw new Error("reading source down");
      return { source: "reading", userId: linkedChild.studentUserId };
    },
  });
  const result = await loader("parent-user");
  assert.equal(result.status, "ok");
  assert.deepEqual(result.products.map((product) => product.id), ["state_track", "reading_buddy", "math_buddy"]);
  assert.deepEqual(result.children.map((item) => item.studentId), ["sp-a", "sp-c", "sp-d", "sp-b"]);
  assert.deepEqual(calls.sort(), ["reading:sp-b", "reading:sp-c", "state:sp-a", "state:sp-b"]);
  assert.deepEqual(result.children[0].availability, { stateTrack: "unavailable", readingBuddy: "not_entitled" });
  assert.deepEqual(result.children[1].availability, { stateTrack: "not_entitled", readingBuddy: "unavailable" });
  assert.deepEqual(result.children[2].availability, { stateTrack: "not_entitled", readingBuddy: "not_entitled" });
  assert.deepEqual(result.children[3].availability, { stateTrack: "ok", readingBuddy: "ok" });

  const coreSource = fs.readFileSync(path.join(process.cwd(), "lib/parent/parentDashboardLoaderCore.ts"), "utf8");
  assert.equal(coreSource.includes("server-only"), false, "pure core must not import server-only");
  assert.equal(coreSource.includes("@prisma/client"), false, "pure core must not import Prisma runtime or enums");

  const shellSource = fs.readFileSync(path.join(process.cwd(), "components/synesis/SynesisPageShell.tsx"), "utf8");
  const headerSource = fs.readFileSync(path.join(process.cwd(), "components/synesis/SynesisHeader.tsx"), "utf8");
  assert.match(shellSource, /variant = "legacy"/, "shell must default to legacy variant");
  assert.match(shellSource, /homeHref = "\/student\/practice"/, "shell must preserve default homeHref");
  assert.match(headerSource, /navigationMode = "legacy"/, "header must default to legacy navigation");
  assert.match(headerSource, /sy-learning-header-left-slim-locked-2048\.png/, "header must retain Sý Learning logo");
  assert.match(headerSource, /navigationMode === "legacy"/, "header must keep legacy switcher branch");
  assert.match(headerSource, /navigationMode === "product"/, "header must add product navigation branch");

  const switcherSource = fs.readFileSync(path.join(process.cwd(), "components/synesis/ProductSwitcher.tsx"), "utf8");
  assert.match(switcherSource, /products\.length <= 1/, "product switcher must hide for zero/one product");
  assert.match(switcherSource, /new URLSearchParams\(searchParams\.toString\(\)\)/, "product switcher must preserve existing query params");
  assert.match(switcherSource, /aria-current=\{active \? "page" : undefined\}/, "product switcher must mark active tab");
  assert.equal(/router\.push/.test(switcherSource), false, "product switcher must use Link instead of router.push");

  const routeSource = fs.readFileSync(path.join(process.cwd(), "app/api/parent/dashboard/route.ts"), "utf8");
  const viewModelSource = fs.readFileSync(path.join(process.cwd(), "lib/parent/parentDashboardViewModel.ts"), "utf8");
  const contract = JSON.parse(fs.readFileSync(path.join(process.cwd(), "tests/fixtures/parent-dashboard-contract.json"), "utf8"));
  assert.match(routeSource, /loadParentDashboard\(/, "route must reuse parent dashboard loader");
  assert.match(routeSource, /Cache-Control": "no-store"/, "route must set no-store");
  assert.match(routeSource, /toParentDashboardViewData\(dashboard\)/, "route must use the compatibility adapter");
  for (const field of contract.legacyChildFields) {
    assert.match(viewModelSource, new RegExp(`${field}:`), `route adapter must preserve legacy child field ${field}`);
  }
  for (const field of contract.additiveChildFields) {
    assert.match(viewModelSource, new RegExp(`${field}:`), `route adapter must add ${field}`);
  }

  console.log("unified shell Phase 1a checks passed");
}

function child(
  studentProfileId: string,
  studentUserId: string,
  name: string,
  grade: number | null,
  enrolledPrograms: any[],
  enrolledTestPrep: any[],
) {
  return { studentProfileId, studentUserId, name, grade, enrolledPrograms, enrolledTestPrep };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
