import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const baseUrl = process.env.WALKTHROUGH_BASE_URL || "http://localhost:3000";
const email = process.env.WALKTHROUGH_STUDENT_EMAIL || "smoke.student@example.com";
const password = process.env.WALKTHROUGH_STUDENT_PASSWORD || "Password123!";

async function main() {
  const student = await db.user.findUniqueOrThrow({ where: { email } });
  const before = await countEvents(student.id);
  const cookie = await login(email, password);
  const results = [] as Array<{ step: string; ok: boolean; detail: string }>;

  results.push(await postJson(cookie, "/api/literacy/diagnostic", { responses: { DECODING: 78, FLUENCY: 70, COMPREHENSION: 68 } }, "Diagnostic submit"));
  results.push(await postJson(cookie, "/api/literacy/item-event", { surface: "walkthrough_practice", itemId: "walkthrough-practice-1", itemType: "placeholder", isCorrect: true }, "Practice answer"));
  results.push(await postJson(cookie, "/api/literacy/item-event", { surface: "walkthrough_speed_drill_word", itemId: "speed-drill-make", itemType: "phonogram_word_placeholder", isCorrect: true }, "Speed-drill word"));
  results.push(await postJson(cookie, "/api/literacy/speed-drill", { wordsRead: 5, wordsCorrect: 4, wordsSelfCorrected: 1, wordsMissed: 0, durationSeconds: 60 }, "Speed-drill summary"));

  const after = await countEvents(student.id);
  const eventDelta = after - before;
  const report = [
    "# Post-Hardening Walkthrough",
    "",
    `- Base URL: ${baseUrl}`,
    `- Student: ${email}`,
    `- ITEM_ANSWER_SUBMITTED before: ${before}`,
    `- ITEM_ANSWER_SUBMITTED after: ${after}`,
    `- New events observed: ${eventDelta}`,
    "",
    "## Steps",
    "",
    ...results.map((result) => `- ${result.ok ? "PASS" : "FAIL"}: ${result.step} - ${result.detail}`),
    "",
    eventDelta >= 4
      ? "Result: PASS. New Reading Buddy diagnostic, practice, and speed-drill paths created StudentEvent rows."
      : "Result: FAIL. Expected at least four new StudentEvent rows from the walkthrough.",
    "",
  ].join("\n");
  const path = resolve(process.cwd(), "audit/post-hardening-walkthrough.md");
  if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, report);
  console.log(report);
  if (eventDelta < 4 || results.some((result) => !result.ok)) process.exit(1);
}

async function login(userEmail: string, userPassword: string) {
  const jar: Record<string, string> = {};
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  storeCookies(jar, csrfResponse);
  const csrf = (await csrfResponse.json()) as { csrfToken: string };
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: userEmail,
    password: userPassword,
    callbackUrl: `${baseUrl}/student/diagnostic`,
    json: "true",
  });
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader(jar) },
    body,
    redirect: "manual",
  });
  storeCookies(jar, response);
  if (response.status >= 400) throw new Error(`Login failed with HTTP ${response.status}`);
  return cookieHeader(jar);
}

async function postJson(cookie: string, path: string, body: unknown, step: string) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
    });
    return { step, ok: response.ok, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { step, ok: false, detail: String(error) };
  }
}

async function countEvents(studentUserId: string) {
  return db.studentEvent.count({ where: { studentUserId, eventType: "ITEM_ANSWER_SUBMITTED" } });
}

function storeCookies(jar: Record<string, string>, response: Response) {
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const values = getSetCookie ? getSetCookie.call(response.headers) : splitSetCookie(response.headers.get("set-cookie"));
  for (const value of values) {
    const [pair] = value.split(";");
    const [key, cookieValue] = pair.split("=");
    if (key && cookieValue) jar[key.trim()] = cookieValue.trim();
  }
}

function splitSetCookie(value: string | null) {
  if (!value) return [];
  return value.split(/,(?=\s*[^;,\s]+=)/);
}

function cookieHeader(jar: Record<string, string>) {
  return Object.entries(jar)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
