import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const parentPage = fs.readFileSync(path.join(root, "app/parent/page.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "components/ParentDashboardPage.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "app/api/parent/dashboard/route.ts"), "utf8");
const middleware = fs.readFileSync(path.join(root, "middleware.ts"), "utf8");
const login = fs.readFileSync(path.join(root, "components/LoginForm.tsx"), "utf8");
const tips = fs.readFileSync(path.join(root, "lib/content/parentHelpTips.ts"), "utf8");
const seed = fs.readFileSync(path.join(root, "scripts/seed-parent-dashboard-p1b.ts"), "utf8");

assert.match(parentPage, /<SynesisPageShell/, "parent page must use the shared shell");
assert.match(parentPage, /variant="product"/, "parent page must opt into product shell mode");
assert.match(parentPage, /homeHref="\/parent"/, "parent logo should return to parent dashboard");
assert.match(parentPage, /<ProductSwitcher products=\{viewData\.products\} activeProduct=\{activeProduct\}/, "parent page must render ProductSwitcher in the shell");
assert.match(parentPage, /loadParentDashboard\(String\(\(session\.user as any\)\.id\)\)/, "parent page must load only the signed-in parent");
assert.match(parentPage, /JSON\.parse\(JSON\.stringify\(toParentDashboardViewData\(dashboard\)\)\)/, "parent page must pass JSON-safe data to the client");
assert.match(parentPage, /export const dynamic = "force-dynamic"/, "parent page must use authenticated-page no-cache pattern");

assert.match(dashboard, /initialData: ParentDashboardViewData/, "dashboard should receive server-loaded initial data");
assert.equal(/fetch\("\/api\/parent\/dashboard"|fetch\('\/api\/parent\/dashboard'/.test(dashboard), false, "dashboard should not refetch its own page data");
assert.match(dashboard, /childrenForProduct/, "dashboard must filter visible children by active product");
assert.match(dashboard, /StateTrackSection/, "dashboard must render State Track section");
assert.match(dashboard, /ReadingBuddySection/, "dashboard must render Reading Buddy section");
assert.match(dashboard, /availability\.stateTrack === "unavailable"/, "dashboard must surface State Track unavailable state");
assert.match(dashboard, /availability\.readingBuddy === "unavailable"/, "dashboard must surface Reading Buddy unavailable state");
assert.match(dashboard, /availability\.stateTrack === "not_entitled"/, "dashboard must distinguish State Track not-entitled state");
assert.match(dashboard, /availability\.readingBuddy === "not_entitled"/, "dashboard must distinguish Reading Buddy not-entitled state");
assert.match(dashboard, /No students are linked to this parent account yet\./, "dashboard must handle no linked children");
assert.match(dashboard, /No active Sý Learning products yet\./, "dashboard must handle no product union");
assert.match(dashboard, /No students are enrolled in this product yet\./, "dashboard must handle empty product filters");
assert.match(dashboard, /How you can help at home/, "dashboard must render at-home tips section");
assert.match(dashboard, /parentHelpTipForKey/, "dashboard must use controlled parent help tips");
assert.match(dashboard, /visibleChildren\.length > 1/, "dashboard must hide selector for a single child");
assert.match(dashboard, /Message teacher · Coming soon/, "message teacher action must be disabled coming-soon");
assert.match(dashboard, /Email me this summary · Coming soon/, "email summary action must be disabled until contract supports unified data");
assert.equal(/row\.performanceBand\}/.test(dashboard), false, "dashboard must not render raw State Track band values");

assert.match(route, /toParentDashboardViewData\(dashboard\)/, "API route and page must share the dashboard view adapter");
assert.equal(/pathname === "\/parent" && role === "PARENT"/.test(middleware), false, "middleware must not redirect parent /parent away from itself");
assert.match(middleware, /role === "PARENT"\) response = NextResponse\.redirect\(new URL\("\/parent"/, "dashboard parent landing must go to /parent");
assert.match(login, /role === "PARENT"[\s\S]*router\.push\("\/parent"\)/, "login parent landing must go to /parent");
assert.match(tips, /main_idea/, "tips must include State Track reading skills");
assert.match(tips, /silent_e/, "tips must include Reading Buddy literacy skills");
assert.match(seed, /ALLOW_PSSA_PARENT_SEED/, "seed must have explicit allow guard");
assert.match(seed, /127\.0\.0\.1/, "seed must guard local DB host");
assert.match(seed, /pssa_dev/, "seed must guard local DB name");
assert.match(seed, /unionEnumValues/, "seed must use additive entitlement unions");

console.log("parent dashboard Phase 1b source checks passed");
