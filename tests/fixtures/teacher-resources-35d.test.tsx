import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const route = read("app/api/teacher/resources/route.ts");
assert.match(route, /export async function GET\(\)/, "resources route must expose GET");
assert.match(route, /requireUser\(\["TEACHER", "ADMIN"\]\)/, "resources route must be TEACHER/ADMIN only");
assert.match(route, /const NO_STORE = \{ "Cache-Control": "no-store" \}/, "resources route must define no-store");
assert.match(route, /headers: NO_STORE/, "resources route must return no-store on success");
assert.match(route, /withNoStore\(auth\.error\)/, "resources route must return no-store on auth failures");
assert.match(route, /db\.resourceLink\.findMany/, "resources route must read ResourceLink rows");
assert.match(route, /take: 500/, "resources route should cap read volume");
assert.match(route, /loadTeacherGrades\(auth\.user\.id, auth\.user\.role\)/, "teacher grades must derive from the authenticated session user");
assert.match(route, /if \(role !== "TEACHER"\) return \[\]/, "admin/non-teacher teacherGrades must be []");
assert.match(route, /where: \{ userId \}/, "teacher profile lookup must use the session userId");
assert.doesNotMatch(route, /req\.json|searchParams|teacherId|clientTeacherId|userId:\s*[^;]*request|request\.url|new URL/, "resources route must not accept client teacher/user impersonation input");

const dtoBody = route.slice(route.indexOf("function toResourceDto"));
for (const key of ["id", "gradeLevel", "standardCode", "skill", "title", "url", "provider", "description", "belowGradeLevel", "aboveGradeLevel"]) {
  assert.match(dtoBody, new RegExp(`${key}: resource\\.${key}`), `resource DTO must include ${key}`);
}
for (const banned of ["createdById", "createdAt", "updatedAt", "createdBy", "heroLessons", "suggestions", "tier"]) {
  assert.doesNotMatch(dtoBody, new RegExp(`\\b${banned}\\b`), `resource DTO must not expose ${banned}`);
}

const panel = read("components/TeacherResourcesPanel.tsx");
assert.match(panel, /fetch\("\/api\/teacher\/resources", \{ cache: "no-store" \}\)/, "resources panel must fetch the resources route");
assert.doesNotMatch(panel, /\/api\/teacher\/learning-lessons/, "resources panel must not fetch lesson-library route");
assert.match(panel, /No resources yet — suggest one for admin review\./, "resources panel must have a friendly empty state");
assert.match(panel, /No approved resources match this filter yet/, "resources panel must explain empty filtered lists");
assert.match(panel, /tierFilter[\s\S]*"all" \| "on_grade" \| "below" \| "above"/, "resources panel must preserve tier filters");
assert.match(panel, /teacherGrades\.has\(Number\(a\.gradeLevel\)\)/, "resources panel must keep teacher-grade-first sort");
assert.match(panel, /fetch\("\/api\/teacher\/resources\/suggest"/, "suggest form must keep POSTing to review route");
assert.match(panel, /Suggest a Resource/, "resources panel must render suggest entry point");
assert.match(panel, /id: "all", label: "All"/, "resources panel must render all filter");
assert.match(panel, /id: "on_grade", label: "On-grade"/, "resources panel must render on-grade filter");
assert.match(panel, /id: "below", label: "Below-grade scaffold"/, "resources panel must render below-grade filter");
assert.match(panel, /id: "above", label: "Above-grade stretch"/, "resources panel must render above-grade filter");

const teacherPage = read("app/teacher/page.tsx");
assert.match(teacherPage, /STATE_TRACK_TABS = \["classes", "lessons", "assignments", "reports", "grading", "resources"\]/, "State Track tabs must include resources");
assert.match(teacherPage, /activeTab === "resources"[\s\S]*<TeacherResourcesPanel \/>/, "resources tab must render real resources panel");
assert.doesNotMatch(teacherPage, /ResourcesMigrationPlaceholder/, "State Track resources tab must not render placeholder");

const toolsPage = read("app/teacher/tools/page.tsx");
assert.match(toolsPage, /redirect\("\/teacher\?tab=resources"\)/, "/teacher/tools must redirect to State Track resources by default");
assert.doesNotMatch(toolsPage, /TeacherDashboardPage|SynesisPageShell|TeacherProductWorkspaceSwitcher/, "/teacher/tools must be redirect-only");

const classesTab = read("components/teacher/TeacherClassesTab.tsx");
assert.doesNotMatch(classesTab, /\/teacher\/tools|Other tools|Open Teacher Tools/, "classes tab must not link to the retired tools hub");

console.log("teacher Resources #35D checks passed");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
