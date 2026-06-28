import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const retiredFiles = [
  "app/api/teacher/dashboard/route.ts",
  "lib/teacherDashboardRouteHandler.ts",
  "lib/teacherStandardsGrouping.ts",
  "lib/standardsRecommendations.ts",
  "tests/fixtures/teacher-dashboard-500.test.ts",
  "app/api/ai/generate-test/route.ts",
  "components/AdminDashboardPage.tsx",
  "app/api/admin/dashboard/route.ts",
  "app/api/teacher/test-design-agent/route.ts",
  "app/api/teacher/diagnostic/route.ts",
];

for (const file of retiredFiles) {
  assert.equal(fs.existsSync(path.join(root, file)), false, `${file} must be retired`);
}

const source = readSource(["app", "components", "lib"], ["components/TeacherLearningPathPanel.tsx", "components/TeacherTdaScoringPanel.tsx"]);
for (const token of [
  "/api/teacher/dashboard",
  "/api/ai/generate-test",
  "/api/admin/dashboard",
  "/api/teacher/test-design-agent",
  "/api/teacher/diagnostic",
  "teacherDashboardRouteHandler",
  "AdminDashboardPage",
  "buildStandardSupportGroups",
  "buildStandardsRecommendations",
]) {
  assert.doesNotMatch(source, new RegExp(escapeRegExp(token)), `${token} must be unreferenced in live source`);
}

const teacherTools = read("components/TeacherDashboardPage.tsx");
assert.match(teacherTools, /fetch\("\/api\/teacher\/classes"/, "teacher tools must load classes from /api/teacher/classes");
assert.doesNotMatch(teacherTools, /\/api\/teacher\/dashboard|\/api\/ai\/generate-test|\/api\/teacher\/test-design-agent|\/api\/teacher\/diagnostic/, "teacher tools must not call retired routes");
assert.doesNotMatch(teacherTools, /TeacherLearningPathPanel|TeacherTdaScoringPanel|Test Design Agent|createDiagnosticAssessment|generateTest|MetricCard|ScoreSourcesPanel|TeacherActionOverview|TeacherLaunchPad/, "legacy dashboard-only UI must be removed");
assert.doesNotMatch(teacherTools, /TeacherClassesPanel|TeacherImportStudentsPanel|Student Import|Import Students From Google Classroom/, "classes/import tabs must move out of legacy teacher tools");
assert.match(teacherTools, /function ReadingCoachToolsPanel/, "reading-coach utility must remain");
assert.equal(fs.existsSync(path.join(root, "components/TeacherResourcesPanel.tsx")), true, "resource suggestion component must be preserved for #35B");
assert.match(teacherTools, /Resources is moving to the new workspace/, "resources tab must render migration placeholder");
assert.doesNotMatch(teacherTools, /Showing \{resources\.length\} approved resources|0 resources/, "resources tab must not render broken empty resource list");
assert.match(teacherTools, /type TeacherToolsTab = "resources" \| "readingCoach"/, "legacy tools tab type must be trimmed to resources/readingCoach");
assert.match(teacherTools, /const teacherToolsTabs[\s\S]*id: "readingCoach"[\s\S]*id: "resources"/, "visible legacy tab set must be readingCoach/resources");
assert.doesNotMatch(teacherTools, /id: "classes"|id: "import"|raw === "classes"|raw === "import"/, "legacy classes/import tabs must be removed");
for (const tab of ["resources", "readingCoach"]) {
  assert.match(teacherTools, new RegExp(`raw === "${tab}"`), `deep link ?tab=${tab} must normalize to that tab`);
}
assert.match(teacherTools, /: "readingCoach"/, "unknown tabs must default to readingCoach");

const importPanel = read("components/TeacherImportStudentsPanel.tsx");
assert.match(importPanel, /export function TeacherImportStudentsPanel/, "import utility must live in its own component");
assert.match(importPanel, /fetch\("\/api\/teacher\/classes"[\s\S]*cache: "no-store"/, "import panel must self-fetch classes");
assert.match(importPanel, /Refresh classes/, "import panel must expose a class refresh path");
for (const endpoint of [
  "/api/teacher/google-classroom/status",
  "/api/teacher/google-classroom/courses",
  "/api/teacher/google-classroom/import",
  "/api/teacher/google-classroom/connect",
]) {
  assert.match(importPanel, new RegExp(escapeRegExp(endpoint)), `import panel must keep ${endpoint}`);
}
const importPanelEndpoints = [...importPanel.matchAll(/["'](\/api\/teacher\/[^"']+)["']/g)].map((match) => match[1]);
for (const endpoint of importPanelEndpoints) {
  assert.match(endpoint, /^\/api\/teacher\/(?:classes|google-classroom\/(?:status|courses|import|connect))$/, `import panel must not call unexpected endpoint ${endpoint}`);
}

const classesTab = read("components/teacher/TeacherClassesTab.tsx");
assert.match(classesTab, /TeacherClassesPanel/, "State Track classes tab must render class management");
assert.match(classesTab, /TeacherImportStudentsPanel/, "State Track classes tab must render import utility");
assert.match(classesTab, /href="\/teacher\/tools\?tab=readingCoach"/, "State Track classes tab must keep temporary link to Teacher Tools");

const adminPage = read("app/admin/page.tsx");
assert.match(adminPage, /getServerSession\(authOptions\)/, "admin index must check the session");
assert.match(adminPage, /role !== "ADMIN"[\s\S]*redirect\("\/login"\)/, "admin index must enforce ADMIN role in-page");
for (const href of [
  "/admin/pssa-review",
  "/admin/pssa-preview",
  "/admin/content/diagnostic-items/queue",
  "/admin/content/passages/queue",
  "/admin/data-flywheel/exports",
  "/admin/data-flywheel/model-comparison",
  "/admin/voice/labeling",
  "/admin/voice/eval-set",
  "/admin/voice/exports",
  "/admin/decisions",
  "/admin/events",
  "/admin/compliance",
  "/admin/grade-test",
]) {
  assert.match(adminPage, new RegExp(escapeRegExp(href)), `admin index must link ${href}`);
}
for (const group of ["PSSA Review", "Content Review", "Data Flywheel", "Voice", "Operations"]) {
  assert.match(adminPage, new RegExp(escapeRegExp(group)), `admin index must render ${group}`);
}
assert.doesNotMatch(adminPage, /AdminDashboardPage|\/api\/admin\/dashboard|generate-test/, "admin index must not use legacy dashboard/generator");

const teacherToolsPage = read("app/teacher/tools/page.tsx");
assert.match(teacherToolsPage, /redirect\("\/teacher\?tab=classes"\)/, "/teacher/tools classes/import deep links must redirect to State Track classes");
assert.match(teacherToolsPage, /activeTab === "classes" \|\| activeTab === "import"/, "/teacher/tools must redirect both removed tabs server-side");
assert.match(teacherToolsPage, /<TeacherDashboardPage \/>/, "/teacher/tools must stay live");
const layout = read("app/layout.tsx");
assert.match(layout, /"\/teacher\/tools"/, "app layout allowlist must keep /teacher/tools");
const teacherPage = read("app/teacher/page.tsx");
assert.match(teacherPage, /TeacherClassesTab/, "modern teacher page must render the real classes tab");
assert.match(teacherPage, /activeTab === "classes"[\s\S]*<TeacherClassesTab \/>/, "modern teacher classes tab must use the classes/import wrapper");
assert.doesNotMatch(teacherPage, /StateTrackPlaceholder|Open existing State Track tools/, "modern classes tab must not render the old placeholder");

const middleware = read("middleware.ts");
assert.match(middleware, /pathname\.startsWith\("\/admin"\) && role !== "ADMIN"/, "middleware must keep /admin ADMIN gate");
assert.match(read("app/api/teacher/classes/route.ts"), /id: classRoom\.id[\s\S]*name: classRoom\.name[\s\S]*grade: classRoom\.grade/, "classes route must return id/name/grade");
assert.match(read("lib/classGrowth.ts"), /buildClassGrowthSummary/, "classGrowth utility must remain");
assert.match(read("lib/essayGrader.ts"), /gradeTdaEssay/, "essay grader must remain");
assert.match(read("app/api/admin/grade-essay-test/route.ts"), /gradeTdaEssay/, "admin grade-test route must remain");
assert.match(read("app/api/teacher/reading-coach/route.ts"), /export async function/, "teacher reading-coach endpoint must remain");
assert.match(read("app/api/teacher/google-classroom/status/route.ts"), /connectUrl/, "google-classroom endpoints must remain");

console.log("legacy analytics retired #35A checks passed");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readSource(dirs: string[], exclude: string[]) {
  const excluded = new Set(exclude.map((item) => path.join(root, item)));
  const chunks: string[] = [];
  for (const dir of dirs) collect(path.join(root, dir), chunks, excluded);
  return chunks.join("\n");
}

function collect(target: string, chunks: string[], excluded: Set<string>) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(target)) collect(path.join(target, child), chunks, excluded);
    return;
  }
  if (excluded.has(target) || !/\.(ts|tsx)$/.test(target)) return;
  chunks.push(read(path.relative(root, target)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
