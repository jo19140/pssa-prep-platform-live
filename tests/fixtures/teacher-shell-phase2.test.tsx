import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TeacherProductWorkspaceSwitcher } from "../../components/synesis/TeacherProductWorkspaceSwitcher";

const root = process.cwd();

const goToReadingBuddy = renderToStaticMarkup(
  <TeacherProductWorkspaceSwitcher
    activeProduct="state_track"
    products={[{ id: "reading_buddy", label: "Reading Buddy", mascot: "Harper", status: "live" }]}
  />,
);
assert.match(goToReadingBuddy, /Go to Reading Buddy/, "single live differing product must render an escape link");
assert.match(goToReadingBuddy, /href="\/teacher\/literacy"/, "single live differing product must link to Reading Buddy workspace");

const singleMatching = renderToStaticMarkup(
  <TeacherProductWorkspaceSwitcher
    activeProduct="reading_buddy"
    products={[{ id: "reading_buddy", label: "Reading Buddy", mascot: "Harper", status: "live" }]}
  />,
);
assert.equal(singleMatching, "", "single live matching product should hide the switcher");

const noLive = renderToStaticMarkup(
  <TeacherProductWorkspaceSwitcher
    activeProduct="state_track"
    products={[{ id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" }]}
  />,
);
assert.equal(noLive, "", "zero live workspace products should hide the switcher");

const fullSwitcher = renderToStaticMarkup(
  <TeacherProductWorkspaceSwitcher
    activeProduct="state_track"
    products={[
      { id: "state_track", label: "State Track", status: "live" },
      { id: "reading_buddy", label: "Reading Buddy", mascot: "Harper", status: "live" },
      { id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" },
    ]}
  />,
);
assert.match(fullSwitcher, /aria-current="page"/, "active workspace must set aria-current");
assert.match(fullSwitcher, /href="\/teacher"/, "State Track must link to /teacher");
assert.match(fullSwitcher, /href="\/teacher\/literacy"/, "Reading Buddy must link to /teacher/literacy");
assert.match(fullSwitcher, /Math Buddy with Damien · Coming soon/, "coming-soon products must render disabled labels");
assert.doesNotMatch(fullSwitcher, /Venus|Mercury|Mars|Earth/i, "teacher switcher must not expose planet codes");

const teacherPage = read("app/teacher/page.tsx");
assert.match(teacherPage, /<SynesisPageShell[\s\S]*variant="product"[\s\S]*homeHref="\/teacher"/, "/teacher must use product shell");
assert.match(teacherPage, /TeacherProductWorkspaceSwitcher products=\{products\} activeProduct="state_track"/, "/teacher must use teacher route switcher");
assert.match(teacherPage, /normalizeStateTrackTab/, "/teacher must normalize tabs");
assert.match(teacherPage, /STATE_TRACK_TABS = \["classes", "lessons", "assignments", "reports", "grading"\]/, "/teacher must define the requested tab frame");
assert.match(teacherPage, /hrefForTab\(resolvedSearchParams, tab\)/, "tab links must preserve search params while replacing tab");
assert.match(teacherPage, /aria-current=\{active \? "page" : undefined\}/, "active tab must set aria-current");
assert.match(teacherPage, /if \(tab === "grading"\)[\s\S]*aria-disabled="true"[\s\S]*Coming soon/, "Grading must be disabled");
assert.match(teacherPage, /<TeacherPssaInsightsClient \/>/, "Reports tab must embed existing insights client");
assert.doesNotMatch(teacherPage, /assign-recommended-lesson|lesson-suggestions|class-report/, "/teacher page must not rewrite report/assign routes");

const insightsPage = read("app/teacher/pssa/insights/page.tsx");
assert.match(insightsPage, /params\.set\("tab", "reports"\)/, "legacy insights route must redirect to reports tab");
assert.match(insightsPage, /redirect\(`\/teacher\?\$\{params\.toString\(\)\}`\)/, "legacy insights redirect must preserve query params");

const teacherTools = read("app/teacher/tools/page.tsx");
assert.match(teacherTools, /<TeacherDashboardPage \/>/, "/teacher/tools must render the legacy dashboard component unchanged");
assert.match(teacherTools, /activeProduct="state_track"/, "/teacher/tools must live under State Track workspace");

const teacherLiteracy = read("app/teacher/literacy/page.tsx");
assert.match(teacherLiteracy, /variant="product"/, "/teacher/literacy must use product shell");
assert.match(teacherLiteracy, /activeProduct="reading_buddy"/, "/teacher/literacy switcher must mark Reading Buddy active");
assert.match(teacherLiteracy, /<TeacherLiteracyMonitor/, "literacy monitor content must remain embedded");

const teacherProducts = read("lib/teacher/loadCurrentTeacherProducts.ts");
assert.match(teacherProducts, /getServerSession\(authOptions\)/, "teacher products must derive user from authenticated session");
assert.match(teacherProducts, /resolveProducts\(user\)/, "teacher products must use shared entitlement resolver");
assert.doesNotMatch(teacherProducts, /userId[:?]\s*string/, "teacher product helper must not accept a URL/client userId");

const middleware = read("middleware.ts");
assert.doesNotMatch(middleware, /pathname === "\/teacher" && role === "TEACHER"/, "middleware must not self-redirect /teacher");
assert.match(middleware, /role === "TEACHER"\) response = NextResponse\.redirect\(new URL\("\/teacher"/, "dashboard teacher landing must go to /teacher");
assert.match(middleware, /pathname === "\/student" && role === "STUDENT"/, "student landing must remain untouched");
assert.match(middleware, /role === "PARENT"\) response = NextResponse\.redirect\(new URL\("\/parent"/, "parent landing must remain untouched");

const layout = read("app/layout.tsx");
assert.match(layout, /pathname === "\/teacher"/, "root layout must include exact /teacher shell route");
assert.match(layout, /"\/teacher\/tools"/, "root layout must include teacher tools shell route");
assert.doesNotMatch(layout, /"\/teacher",/, "root layout must not treat every /teacher/* route as shell-owned");

console.log("teacher shell Phase 2 checks passed");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
