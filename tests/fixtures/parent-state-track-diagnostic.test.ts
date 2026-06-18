import assert from "node:assert/strict";

import { normalizePssaReportForm } from "../../lib/content/pssaReportFormNormalizer";
import {
  buildParentStateTrackPayloadFromDiagnostic,
  deriveDiagnosticSeason,
  ParentStateTrackDiagnosticError,
  selectLatestGradeMatchedSession,
  type ParentStateTrackSession,
} from "../../lib/parent/parentStateTrackFromDiagnostic";
import { toParentDashboardViewData } from "../../lib/parent/parentDashboardViewModel";

const BANNED_PROPERTY_NAMES = new Set([
  "distractorrole",
  "likelypatterns",
  "missedreview",
  "prioritycluster",
  "recommendednextstep",
  "teachermove",
  "responsesignal",
  "errorpattern",
  "evidence",
  "evidenceitemids",
  "correctresponsejson",
  "correctindex",
  "iscorrect",
  "rationale",
  "responsespecjson",
  "responses",
  "responsepayloadjson",
  "choices",
  "structuredchoicesjson",
]);

const latest = session({
  id: "session_latest",
  earnedPoints: 39,
  totalPoints: 45,
  submittedAt: "2026-02-02T12:00:00.000Z",
  formContentHashAtStart: "hash_1",
  responses: [
    scored("kie_1", 1),
    scored("kie_2", 1),
    scored("kie_3", 1),
    scored("kie_4", 1),
    scored("kie_5", 0),
  ],
});
const prior = session({
  id: "session_prior",
  earnedPoints: 36,
  totalPoints: 45,
  submittedAt: "2026-01-02T12:00:00.000Z",
  formContentHashAtStart: "hash_1",
});

const payload = buildParentStateTrackPayloadFromDiagnostic({
  userId: "student_user",
  studentName: "Ava Carter",
  grade: 3,
  latest,
  olderSessions: [prior],
});
assert.equal(payload.latestScore, 87, "39/45 must round to 87%");
assert.equal((payload.growth as { growthPoints: number }).growthPoints, 7, "growth must use percentage points, not raw points");
assert.equal(payload.latestAssessment, "Grade 3 ELA Diagnostic — Fall");
assert.equal(payload.scoreStatus, "final");
assert.equal(payload.standardsMastery.find((row) => (row as { standardCode: string }).standardCode === "key_ideas_evidence")
  && (payload.standardsMastery.find((row) => (row as { standardCode: string }).standardCode === "key_ideas_evidence") as { percentScore: number }).percentScore, 80);

assert.equal(noGrowth({ formContentHashAtStart: "hash_2" }), null, "different content hashes are not comparable");
assert.equal(noGrowth({ formId: "other_form" }), null, "different form ids are not comparable");
assert.equal(noGrowth({ formContentHashAtStart: "" }, { formContentHashAtStart: "" }), null, "two empty hashes are not comparable");
assert.equal(noGrowth({ pendingHumanPoints: 3 }), null, "provisional prior is not comparable");

const provisional = buildParentStateTrackPayloadFromDiagnostic({
  userId: "student_user",
  studentName: "Ava Carter",
  grade: 3,
  latest: session({ id: "session_provisional", earnedPoints: 39, totalPoints: 45, pendingHumanPoints: 3 }),
  olderSessions: [prior],
});
assert.equal(provisional.latestScore, 87);
assert.equal(provisional.scoreStatus, "provisional");
assert.equal(provisional.growth, null, "provisional latest session must not receive growth");

assert.throws(
  () => buildParentStateTrackPayloadFromDiagnostic({
    userId: "student_user",
    studentName: "Ava Carter",
    grade: 3,
    latest: session({ id: "session_long", earnedPoints: 44, totalPoints: 50, formTotalPoints: 50 }),
    olderSessions: [],
  }),
  (error) => error instanceof ParentStateTrackDiagnosticError && error.reason === "unsupported_operational_max",
);

assert.equal(selectLatestGradeMatchedSession([
  session({ id: "new_wrong_grade", submittedAt: "2026-03-01T00:00:00.000Z", gradeLevel: 4 }),
  session({ id: "old_right_grade", submittedAt: "2026-02-01T00:00:00.000Z", gradeLevel: 3 }),
], 3)?.id, "old_right_grade");

assert.deepEqual(deriveDiagnosticSeason(3, "grade3-moy-v1"), { benchmarkSeason: "MOY", displaySeason: "Winter" });
assert.deepEqual(deriveDiagnosticSeason(3, "unversioned"), { benchmarkSeason: "Diagnostic", displaySeason: "Diagnostic" });

assert.deepEqual(normalizePssaReportForm(baseForm()), {
  id: "form_1",
  formId: "form_1",
  formVersion: "hash_1",
  blueprintVersion: "grade3-boy-v1",
  contentHash: "hash_1",
  items: baseForm().items.map((formItem) => ({
    id: formItem.itemId,
    itemId: formItem.itemId,
    interactionType: "MCQ",
    itemType: "MCQ",
    eligibleContent: formItem.item.eligibleContent,
    reportingCategory: formItem.item.reportingCategory,
    correctIndex: 0,
    structuredChoicesJson: ["A", "B", "C", "D"],
    answerChoicesJson: ["A", "B", "C", "D"],
    choices: ["A", "B", "C", "D"],
  })),
}, "shared normalizer must preserve the prior WS2-R1 report form shape");

assertBannedKeys(payload);
const serializedApiShape = JSON.parse(JSON.stringify(toParentDashboardViewData({
  status: "ok",
  parent: { id: "parent", childCount: 1 },
  products: [{ id: "state_track", label: "State Track", status: "live" }],
  children: [{
    studentId: "student_profile",
    studentUserId: "student_user",
    name: "Ava Carter",
    grade: 3,
    entitlements: [{ id: "state_track", label: "State Track", status: "live" }],
    stateTrack: { ...payload, standardsMastery: [{ ...(payload.standardsMastery[0] as Record<string, unknown>), standardLabel: "Text Evidence" }] },
    readingBuddy: null,
    availability: { stateTrack: "ok", readingBuddy: "not_entitled" },
  }],
})));
assertBannedKeys(serializedApiShape);

console.log("parent State Track diagnostic adapter checks passed");

function noGrowth(priorPatch: Partial<ParentStateTrackSession>, latestPatch: Partial<ParentStateTrackSession> = {}) {
  return buildParentStateTrackPayloadFromDiagnostic({
    userId: "student_user",
    studentName: "Ava Carter",
    grade: 3,
    latest: session({ ...latestPatch, id: latestPatch.id ?? "latest_no_growth", earnedPoints: 39, totalPoints: 45 }),
    olderSessions: [session({ ...priorPatch, id: priorPatch.id ?? "prior_no_growth", earnedPoints: 36, totalPoints: 45 })],
  }).growth;
}

function session(patch: Partial<ParentStateTrackSession> & { id: string; formTotalPoints?: number; gradeLevel?: number }): ParentStateTrackSession {
  return {
    id: patch.id,
    userId: patch.userId ?? "student_user",
    formId: patch.formId ?? "form_1",
    formContentHashAtStart: patch.formContentHashAtStart ?? "hash_1",
    status: patch.status ?? "submitted",
    earnedPoints: patch.earnedPoints ?? 39,
    totalPoints: patch.totalPoints ?? 45,
    pendingHumanPoints: patch.pendingHumanPoints ?? 0,
    submittedAt: patch.submittedAt ?? "2026-02-02T12:00:00.000Z",
    form: patch.form ?? baseForm({ totalPoints: patch.formTotalPoints, gradeLevel: patch.gradeLevel }),
    responses: patch.responses ?? [],
  };
}

function baseForm(patch: { totalPoints?: number; gradeLevel?: number } = {}) {
  return {
    id: "form_1",
    contentHash: "hash_1",
    blueprintVersion: "grade3-boy-v1",
    gradeLevel: patch.gradeLevel ?? 3,
    totalPoints: patch.totalPoints ?? 45,
    items: [
      formItem("kie_1", "E03.B-K.1.1.1"),
      formItem("kie_2", "E03.B-K.1.1.2"),
      formItem("kie_3", "E03.B-K.1.1.3"),
      formItem("kie_4", "E03.B-K.1.1.4"),
      formItem("kie_5", "E03.B-K.1.1.5"),
      formItem("craft_1", "E03.B-C.2.1.1"),
      formItem("vocab_1", "E03.B-V.4.1.1"),
      formItem("conv_1", "E03.D.1.1.1", "D"),
    ],
  };
}

function formItem(itemId: string, eligibleContent: string, reportingCategory = "A") {
  return {
    itemId,
    item: {
      itemType: "MCQ",
      interactionType: "MCQ",
      eligibleContent,
      reportingCategory,
      responseSpecJson: { choices: ["A", "B", "C", "D"] },
      correctResponseJson: { correctIndex: 0 },
    },
  };
}

function scored(itemId: string, pointsEarned: number) {
  return {
    itemId,
    responsePayloadJson: { selectedIndex: pointsEarned ? 0 : 1 },
    scoreStatus: "scored",
    pointsEarned,
    maxPoints: 1,
  };
}

function assertBannedKeys(value: unknown) {
  const hits: string[] = [];
  scanKeys(value, hits);
  assert.deepEqual(hits, [], `parent payload must not expose teacher-only keys: ${hits.join(", ")}`);
}

function scanKeys(value: unknown, hits: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) scanKeys(item, hits);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (BANNED_PROPERTY_NAMES.has(normalized)) hits.push(key);
    scanKeys(child, hits);
  }
}
