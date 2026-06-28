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
assert.doesNotMatch(teacherTools, /fetch\(|\/api\/teacher\/classes|\/api\/teacher\/learning-lessons|\/api\/teacher\/reading-coach/, "teacher tools must not fetch classes, lessons, or reading-coach data");
assert.doesNotMatch(teacherTools, /\/api\/teacher\/dashboard|\/api\/ai\/generate-test|\/api\/teacher\/test-design-agent|\/api\/teacher\/diagnostic/, "teacher tools must not call retired routes");
assert.doesNotMatch(teacherTools, /TeacherLearningPathPanel|TeacherTdaScoringPanel|Test Design Agent|createDiagnosticAssessment|generateTest|MetricCard|ScoreSourcesPanel|TeacherActionOverview|TeacherLaunchPad/, "legacy dashboard-only UI must be removed");
assert.doesNotMatch(teacherTools, /TeacherClassesPanel|TeacherImportStudentsPanel|Student Import|Import Students From Google Classroom/, "classes/import tabs must move out of legacy teacher tools");
assert.doesNotMatch(teacherTools, /ReadingCoachToolsPanel|readingCoachAssignments|readingCoachForm|assignReadingCoach|loadReadingCoachAssignments|readingCoachMessage|assigningReadingCoach|Reading Coach|Read-Aloud Practice/, "reading-coach utility must move out of legacy teacher tools");
assert.equal(fs.existsSync(path.join(root, "components/TeacherResourcesPanel.tsx")), true, "resource suggestion component must be preserved for #35D");
assert.match(teacherTools, /Resources is moving to the new workspace/, "resources tab must render migration placeholder");
assert.doesNotMatch(teacherTools, /TeacherToolsTab|teacherToolsTabs|raw === "classes"|raw === "import"|raw === "readingCoach"|raw === "resources"|useState|useEffect/, "legacy tools tab state must be removed");
assert.match(teacherTools, />Resources</, "visible legacy hub must be resources only");

const resourcesPanel = read("components/TeacherResourcesPanel.tsx");
assert.match(resourcesPanel, /fetch\("\/api\/teacher\/resources", \{ cache: "no-store" \}\)/, "resources panel must fetch rebuilt resources route");
assert.doesNotMatch(resourcesPanel, /\/api\/teacher\/learning-lessons/, "resources panel must not fetch lesson-library route");
assert.match(resourcesPanel, /No resources yet — suggest one for admin review\./, "resources panel must have an honest empty state");
assert.match(resourcesPanel, /fetch\("\/api\/teacher\/resources\/suggest"/, "resources panel must keep suggestion POST");

const readingCoachPanel = read("components/literacy/TeacherReadingCoachPanel.tsx");
assert.match(readingCoachPanel, /export function TeacherReadingCoachPanel/, "reading-coach utility must live in its Reading Buddy component");
assert.match(readingCoachPanel, /title: "Reading Coach Fluency Practice"/, "reading-coach form title default must be preserved");
assert.match(readingCoachPanel, /gradeLevel: "6"/, "reading-coach grade default must be preserved");
assert.match(readingCoachPanel, /expectedText: "Maya stood at the front of the room/, "reading-coach passage default must be preserved");
assert.match(readingCoachPanel, /fetch\("\/api\/teacher\/reading-coach"[\s\S]*cache: "no-store"/, "reading-coach panel must keep GET contract");
assert.match(readingCoachPanel, /fetch\("\/api\/teacher\/reading-coach"[\s\S]*method: "POST"/, "reading-coach panel must keep POST contract");
const readingCoachPanelEndpoints = [...readingCoachPanel.matchAll(/["'](\/api\/teacher\/[^"']+)["']/g)].map((match) => match[1]);
for (const endpoint of readingCoachPanelEndpoints) {
  assert.equal(endpoint, "/api/teacher/reading-coach", `reading-coach panel must not call unexpected endpoint ${endpoint}`);
}

const readingCoachPage = read("app/teacher/literacy/reading-coach/page.tsx");
assert.match(readingCoachPage, /TeacherReadingCoachPanel/, "reading-coach sub-route must render the extracted panel");
assert.match(readingCoachPage, /SynesisPageShell[\s\S]*variant="product"[\s\S]*homeHref="\/teacher"/, "reading-coach sub-route must mirror the main literacy product shell");
assert.match(readingCoachPage, /activeProduct="reading_buddy"/, "reading-coach sub-route must live under Reading Buddy");
assert.match(readingCoachPage, /href="\/teacher\/literacy"/, "reading-coach sub-route must link back to the literacy monitor");
assert.match(readingCoachPage, /Reading Coach — assign read-aloud practice/, "reading-coach sub-route must render the approved title");

const literacyMonitor = read("components/literacy/TeacherLiteracyMonitor.tsx");
assert.match(literacyMonitor, /href="\/teacher\/literacy\/reading-coach"/, "literacy monitor must link to Reading Coach practice");

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
assert.doesNotMatch(classesTab, /\/teacher\/tools|Other tools|Open Teacher Tools|tab=readingCoach/, "State Track classes tab must not link to the retired tools hub");

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
assert.match(teacherToolsPage, /activeTab === "readingCoach"[\s\S]*redirect\("\/teacher\/literacy\/reading-coach"\)/, "/teacher/tools readingCoach deep link must redirect to Reading Buddy");
assert.match(teacherToolsPage, /redirect\("\/teacher\?tab=resources"\)/, "/teacher/tools resources/no-tab deep links must redirect to State Track resources");
assert.doesNotMatch(teacherToolsPage, /TeacherDashboardPage|SynesisPageShell|TeacherProductWorkspaceSwitcher/, "/teacher/tools must be redirect-only");
const layout = read("app/layout.tsx");
assert.match(layout, /"\/teacher\/tools"/, "app layout allowlist must keep /teacher/tools");
const teacherPage = read("app/teacher/page.tsx");
assert.match(teacherPage, /TeacherClassesTab/, "modern teacher page must render the real classes tab");
assert.match(teacherPage, /activeTab === "classes"[\s\S]*<TeacherClassesTab \/>/, "modern teacher classes tab must use the classes/import wrapper");
assert.match(teacherPage, /activeTab === "resources"[\s\S]*<TeacherResourcesPanel \/>/, "modern teacher resources tab must use the real resources panel");
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
