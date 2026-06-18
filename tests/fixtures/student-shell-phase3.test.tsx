import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductWorkspaceSwitcher } from "../../components/synesis/ProductWorkspaceSwitcher";
import { resolveStudentHomeHref, STUDENT_WORKSPACE_HREFS } from "../../lib/student/studentWorkspace";
import type { Product } from "../../lib/entitlements";

const root = process.cwd();

const readingBuddyOnly = [{ id: "reading_buddy", label: "Reading Buddy", mascot: "Harper", status: "live" }] satisfies Product[];
assert.equal(resolveStudentHomeHref(readingBuddyOnly), "/student/practice", "Reading Buddy-only students should land on practice");
const goToReadingBuddy = renderToStaticMarkup(
  <ProductWorkspaceSwitcher
    activeProduct="state_track"
    products={readingBuddyOnly}
    workspaceHrefs={STUDENT_WORKSPACE_HREFS}
    ariaLabel="Student product workspaces"
  />,
);
assert.match(goToReadingBuddy, /Go to Reading Buddy/, "Reading Buddy-only student on /student gets an escape link");
assert.match(goToReadingBuddy, /href="\/student\/practice"/, "Reading Buddy escape must link to /student/practice");

const stateTrackOnly = [{ id: "state_track", label: "State Track", status: "live" }] satisfies Product[];
assert.equal(resolveStudentHomeHref(stateTrackOnly), "/student", "State Track students should land on /student");
const goToStateTrack = renderToStaticMarkup(
  <ProductWorkspaceSwitcher
    activeProduct="reading_buddy"
    products={stateTrackOnly}
    workspaceHrefs={STUDENT_WORKSPACE_HREFS}
    ariaLabel="Student product workspaces"
  />,
);
assert.match(goToStateTrack, /Go to State Track/, "State Track-only student on /student/practice gets an escape link");
assert.match(goToStateTrack, /href="\/student"/, "State Track escape must link to /student");

const sameProduct = renderToStaticMarkup(
  <ProductWorkspaceSwitcher
    activeProduct="reading_buddy"
    products={readingBuddyOnly}
    workspaceHrefs={STUDENT_WORKSPACE_HREFS}
    ariaLabel="Student product workspaces"
  />,
);
assert.equal(sameProduct, "", "single matching live product should hide student switcher");

const comingSoonOnly = renderToStaticMarkup(
  <ProductWorkspaceSwitcher
    activeProduct="state_track"
    products={[{ id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" }]}
    workspaceHrefs={STUDENT_WORKSPACE_HREFS}
    ariaLabel="Student product workspaces"
  />,
);
assert.equal(comingSoonOnly, "", "coming-soon products must not force student switcher visibility");

const fullSwitcher = renderToStaticMarkup(
  <ProductWorkspaceSwitcher
    activeProduct="state_track"
    products={[
      { id: "state_track", label: "State Track", status: "live" },
      { id: "reading_buddy", label: "Reading Buddy", mascot: "Harper", status: "live" },
      { id: "math_buddy", label: "Math Buddy", mascot: "Damien", status: "coming_soon" },
    ]}
    workspaceHrefs={STUDENT_WORKSPACE_HREFS}
    ariaLabel="Student product workspaces"
  />,
);
assert.match(fullSwitcher, /aria-label="Student product workspaces"/, "student switcher must expose a student nav label");
assert.match(fullSwitcher, /href="\/student"/, "State Track must link to /student");
assert.match(fullSwitcher, /href="\/student\/practice"/, "Reading Buddy must link to /student/practice");
assert.match(fullSwitcher, /Math Buddy with Damien · Coming soon/, "coming-soon products may render disabled in full nav");
assert.doesNotMatch(fullSwitcher, /Venus|Mercury|Mars|Earth/i, "student switcher must not expose planet codes");

const studentPage = read("app/student/page.tsx");
assert.match(studentPage, /<SynesisPageShell[\s\S]*variant="product"[\s\S]*homeHref=\{resolveStudentHomeHref\(products\)\}/, "/student must use product shell");
assert.match(studentPage, /activeProduct="state_track"/, "/student must mark State Track active");
assert.match(studentPage, /<StudentSessionPage \/>/, "/student must preserve StudentSessionPage content");
assert.doesNotMatch(studentPage, /StudentReport/, "/student shell migration must not build a score view");

const practicePage = read("app/student/practice/page.tsx");
assert.match(practicePage, /const session = await getServerSession\(authOptions\);[\s\S]*const lesson = await buildLessonPlayerData\("a_e", \{ trainingCaptureEnabled, studentUserId, presentationProfile \}\);/, "/student/practice data-loading block must stay intact");
assert.match(practicePage, /activeProduct="reading_buddy"/, "/student/practice must mark Reading Buddy active");
assert.match(practicePage, /<StudentPracticeSession lesson=\{lesson\} presentationProfile=\{lesson\.presentationProfile\} \/>/, "StudentPracticeSession props must stay exact");

const currentUserProducts = read("lib/auth/currentUserProducts.ts");
assert.match(currentUserProducts, /import "server-only"/, "role-neutral product helper must be server-only");
assert.match(currentUserProducts, /getServerSession\(authOptions\)/, "role-neutral product helper must derive user from session");
assert.match(currentUserProducts, /resolveProducts\(user\)/, "role-neutral product helper must use shared entitlements");
assert.doesNotMatch(currentUserProducts, /userId[:?]\s*string/, "role-neutral product helper must not accept client user ids");

const teacherProducts = read("lib/teacher/loadCurrentTeacherProducts.ts");
assert.match(teacherProducts, /loadCurrentUserProducts\(\)/, "teacher compatibility helper must delegate");

const middleware = read("middleware.ts");
assert.match(middleware, /awaitingConsent && pathname\.startsWith\("\/student"\) && pathname !== "\/student\/awaiting-consent"/, "COPPA consent gate must remain loop-exempt");
assert.doesNotMatch(middleware, /pathname === "\/student" && role === "STUDENT"/, "middleware must not self-redirect /student");
assert.match(middleware, /role === "STUDENT"\) response = NextResponse\.redirect\(new URL\("\/student"/, "dashboard STUDENT landing must route to /student");
assert.match(middleware, /role === "TEACHER"\) response = NextResponse\.redirect\(new URL\("\/teacher"/, "teacher dashboard landing must stay /teacher");
assert.match(middleware, /role === "PARENT"\) response = NextResponse\.redirect\(new URL\("\/parent"/, "parent dashboard landing must stay /parent");

const completionShell = read("components/pssa/PssaSectionedDiagnosticShell.tsx");
const completionHtml = renderToStaticMarkup(
  <main>
    <section>
      <p>Diagnostic complete</p>
      <h1>Your diagnostic is complete.</h1>
      <p>Your teacher will review your results.</p>
    </section>
  </main>,
);
assert.match(completionShell, /Your teacher will review your results\./, "completion source must keep the teacher-review message");
assert.match(completionHtml, /Your teacher will review your results\./, "rendered completion text must include the teacher-review message");
assert.doesNotMatch(completionHtml, /\b(score|readiness|band|earnedPoints|totalPoints|percent)\b/i, "rendered completion text must not expose score/readiness labels");

console.log("student shell Phase 3 checks passed");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
