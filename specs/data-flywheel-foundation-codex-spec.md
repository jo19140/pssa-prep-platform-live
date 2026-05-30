# Data Flywheel Foundation · Codex Implementation Spec

**Status:** Draft for Codex execution
**Author:** Jonathan Diaz (with Claude assistance)
**Date:** 2026-05-24
**Companion to:** `specs/voice-data-flywheel-codex-spec.md` (voice-specific flywheel) and `specs/reading-buddy-v1-codex-spec.md` (Reading Buddy v1 chassis)
**Enables:** every future flywheel spec — item-response, lesson-effectiveness, autopilot-outcome, miscue-classifier, parent-summary, TDA-scoring, distractor-critic — plus the long-term path to reducing LLM-vendor dependency.

---

## 1. Overview

This spec covers the **unified instrumentation layer** that turns every interaction in the platform into structured, queryable data and turns every model call (LLM or otherwise) into a logged decision with measurable downstream outcomes.

Two new core models do almost all the work:

- **`StudentEvent`** — every meaningful student interaction with context, response, duration, and immediate outcome.
- **`ModelDecision`** — every call to a model (GPT-4o, Claude, in-house classifier, rule-based scorer) with its inputs, output, cost, and downstream outcome.

Together they form the substrate that future flywheel specs train on. Without this foundation each downstream flywheel would have to re-invent capture, consent, and outcome attribution. With it, each downstream flywheel is a small spec that adds an event type or a decision type and a model.

This spec is **not** about training any models. It's about putting the pipes in place so that future training is cheap, the data is clean, and consent is honored everywhere.

---

## 2. Why This Spec First

Three reasons:

**Compounding capture.** Every day this spec is unshipped is a day of training data nobody is keeping. Item responses, lesson abandonments, autopilot decisions, and tutor overrides are all happening now and disappearing into logs nobody can train on later.

**Single privacy surface.** Right now voice has a consent model (per `specs/voice-data-flywheel-codex-spec.md`), but item responses, essay submissions, and behavioral data have no equivalent. A unified event stream means one place to enforce consent, retention, and DSR handling — not one per data type.

**LLM independence depends on it.** Replacing GPT-4o or Claude with in-house fine-tuned models requires a labeled corpus of inputs, outputs, and outcomes. `ModelDecision` is that corpus. Without it, every existing LLM call is a sunk cost — you pay for the inference and throw away the training signal.

---

## 3. In Scope / Out of Scope

### In scope

- Database schema for: `StudentEvent`, `StudentEventOutcome`, `ModelDecision`, `ModelDecisionOutcome`, `EventExportBatch`.
- Instrumentation library: `lib/events/` and `lib/decisions/` with typed helpers for recording events and wrapping model calls.
- Consent integration: events and decisions honor the two-tier consent model from `specs/voice-data-flywheel-codex-spec.md` (Tier 1 service retention, Tier 2 training opt-in).
- Outcome computation: nightly job that backfills downstream outcomes (mastery delta, retention pass/fail, tutor override flags) onto events and decisions.
- Wrapping (not replacing) the first 3-5 high-value LLM call sites — TDA scoring, distractor generation, gist grading, lesson generation, parent summary — so they emit `ModelDecision` rows.
- Admin event explorer UI for inspection, debugging, and exploratory analysis.
- Export tooling: `EventExportBatch` with consent-honoring exclusion, JSONL manifest format, eval-vs-training discipline.
- Retention enforcement: same cron pattern as voice flywheel, extended to event/decision retention.

### Out of scope

- **No model training, fine-tuning, or model swaps.** Wrapping existing LLM calls preserves their current behavior exactly. Future per-flywheel specs handle training.
- **No new event types beyond the initial vocabulary** (see §4.3). Each future flywheel adds the event types it needs.
- **No real-time analytics dashboards.** Admin event explorer is for inspection, not BI. Real-time analytics is a separate spec.
- **No researcher-facing public API.** All exports are admin-only.
- **No changes to existing autopilot, scoring, or lesson-generation behavior.** Only the wrapping changes.
- **No payment/billing event capture.** Separate concern.

---

## 4. Database Schema Changes

All additions to `prisma/schema.prisma`.

### 4.1 New models

```prisma
model StudentEvent {
  id                String    @id @default(cuid())
  studentUserId     String
  sessionId         String?   // links events that happened in the same logical session (e.g. one practice session)
  eventType         String    // controlled vocabulary — see lib/events/eventTypes.ts
  occurredAt        DateTime  @default(now())

  // Context: what was happening when the event occurred.
  // Examples: { itemId, lessonId, planId, autopilotDecisionId, phonogramCode, standardCode, voiceSessionId, retentionTier }
  contextJson       Json

  // What the student did. Schema varies by eventType.
  // Examples: { selectedOptionIndex }, { essayText, wordCount }, { recordingKey, transcript }
  responseJson      Json?

  // How long they took (where meaningful)
  durationMs        Int?

  // Immediate outcome where determinable at the moment of the event
  immediateOutcome  String?   // "CORRECT" | "INCORRECT" | "PARTIAL" | "ABANDONED" | "SELF_CORRECTED" | "TIMED_OUT" | "SKIPPED"

  // Provenance
  clientPlatform    String?   // "WEB" | "IOS" | "ANDROID" (future)
  appVersion        String?

  // Privacy & retention — mirrors the two-tier consent model
  retentionTier     String    @default("SERVICE")  // "SERVICE" | "TRAINING" | "NONE"
  deleteAfterDate   DateTime?

  student           User      @relation("StudentEvents", fields: [studentUserId], references: [id], onDelete: Cascade)
  outcomes          StudentEventOutcome[]
  modelDecisions    ModelDecision[]

  @@index([studentUserId, occurredAt])
  @@index([eventType, occurredAt])
  @@index([sessionId])
  @@index([deleteAfterDate])
}

model StudentEventOutcome {
  id                String    @id @default(cuid())
  studentEventId    String

  outcomeType       String    // "MASTERY_DELTA_24H" | "MASTERY_DELTA_7D" | "RETENTION_PASS_7D" | "RETENTION_PASS_30D" | "FOLLOWUP_PASS" | "STANDARD_PROGRESSION" | "TUTOR_ANNOTATION" | "PARENT_ENGAGEMENT" | ...
  measuredAt        DateTime  @default(now())

  outcomeScore      Float?    // numeric measurement where applicable
  outcomeLabel      String?   // categorical measurement where applicable
  metricJson        Json?     // structured detail (e.g. specific standards moved, before/after scores)

  studentEvent      StudentEvent @relation(fields: [studentEventId], references: [id], onDelete: Cascade)

  @@unique([studentEventId, outcomeType])
  @@index([outcomeType, measuredAt])
}

model ModelDecision {
  id                String    @id @default(cuid())

  // What kind of decision
  decisionType      String    // controlled vocabulary — see lib/decisions/decisionTypes.ts
  // Examples: "DISTRACTOR_GENERATION" | "LESSON_GENERATION" | "TDA_SCORING" | "GIST_GRADING" | "AUTOPILOT_PLAN" | "PARENT_SUMMARY" | "MISCUE_CLASSIFICATION" | "HERO_VIDEO_MATCH" | "DISTRACTOR_CRITIC"

  // Who made the decision
  modelProvider     String    // "OPENAI" | "ANTHROPIC" | "FINE_TUNED_LLAMA" | "RULE_BASED" | "IN_HOUSE_CLASSIFIER" | "HEURISTIC"
  modelName         String    // e.g. "gpt-4o-2024-08-06", "claude-sonnet-4-6", "rb-lesson-gen-v1"
  modelVersion      String?   // explicit version pinning where useful

  // What was the input
  inputContextJson  Json      // structured context (ids, parameters, prompt key)
  inputHash         String    // stable hash of input for caching + replay
  promptKey         String?   // identifier of the prompt template used (not the prompt text, which may contain PII)

  // What did the model decide
  decisionJson      Json
  outputHash        String?   // hash of the decision output, for change-tracking

  // Performance metadata
  inferenceMs       Int?
  inputTokens       Int?
  outputTokens      Int?
  costUsd           Float?

  // Linking
  studentEventId    String?   // the student event this decision relates to, if any
  parentDecisionId  String?   // for chained calls (e.g. generation → critique → revision)

  // Privacy
  retentionTier     String    @default("SERVICE")
  deleteAfterDate   DateTime?

  occurredAt        DateTime  @default(now())

  studentEvent      StudentEvent? @relation(fields: [studentEventId], references: [id], onDelete: SetNull)
  parentDecision    ModelDecision? @relation("DecisionChain", fields: [parentDecisionId], references: [id], onDelete: SetNull)
  childDecisions    ModelDecision[] @relation("DecisionChain")
  outcomes          ModelDecisionOutcome[]

  @@index([decisionType, occurredAt])
  @@index([modelProvider, modelName, occurredAt])
  @@index([inputHash])
  @@index([studentEventId])
  @@index([deleteAfterDate])
}

model ModelDecisionOutcome {
  id                String    @id @default(cuid())
  modelDecisionId   String

  outcomeType       String    // "DOWNSTREAM_MASTERY" | "TUTOR_OVERRIDE" | "STUDENT_FOLLOWUP_PASS" | "QA_FLAG" | "PARENT_ACTION" | "DISTRACTOR_SELECTION_RATE" | "HUMAN_PREFERENCE" | ...
  outcomeScore      Float?
  outcomeLabel      String?
  metricJson        Json?
  measuredAt        DateTime  @default(now())

  modelDecision     ModelDecision @relation(fields: [modelDecisionId], references: [id], onDelete: Cascade)

  @@unique([modelDecisionId, outcomeType])
  @@index([outcomeType, measuredAt])
}

model EventExportBatch {
  id                  String    @id @default(cuid())
  batchName           String    @unique
  exportPurpose       String    // "TRAINING" | "EVAL" | "RESEARCH" | "DEBUG"
  // What was included
  eventCount          Int
  decisionCount       Int
  eventTypeFilter     String[]
  decisionTypeFilter  String[]
  dateRangeStart      DateTime?
  dateRangeEnd        DateTime?
  // Consent audit
  consentTierMinimum  String    // "TRAINING" excludes anything with retentionTier = "SERVICE" only
  excludedRecordCount Int       @default(0)
  // Output
  manifestStorageKey  String    // JSONL manifest path
  // Provenance
  exportedByUserId    String
  exportedAt          DateTime  @default(now())
  notes               String?   @db.Text

  @@index([exportPurpose, exportedAt])
}
```

### 4.2 Field additions to existing models

```prisma
// Add to User
studentEvents     StudentEvent[]    @relation("StudentEvents")
```

### 4.3 Event type vocabulary (string constants, not a Prisma enum)

`lib/events/eventTypes.ts`. Kept as constants so the taxonomy can evolve without migrations:

```ts
export const EVENT_TYPES = {
  // Item responses
  ITEM_ANSWER_SUBMITTED: "ITEM_ANSWER_SUBMITTED",
  ITEM_ANSWER_REVISED: "ITEM_ANSWER_REVISED",
  ITEM_SKIPPED: "ITEM_SKIPPED",
  ITEM_HINT_REQUESTED: "ITEM_HINT_REQUESTED",

  // Essay / TDA
  ESSAY_SUBMITTED: "ESSAY_SUBMITTED",
  ESSAY_REVISED: "ESSAY_REVISED",

  // Lessons
  LESSON_STARTED: "LESSON_STARTED",
  LESSON_STEP_COMPLETED: "LESSON_STEP_COMPLETED",
  LESSON_COMPLETED: "LESSON_COMPLETED",
  LESSON_ABANDONED: "LESSON_ABANDONED",
  LESSON_RESTARTED: "LESSON_RESTARTED",

  // Voice (overlaps with voice flywheel; events are emitted in addition to VoiceSession rows)
  VOICE_SESSION_STARTED: "VOICE_SESSION_STARTED",
  VOICE_SESSION_COMPLETED: "VOICE_SESSION_COMPLETED",
  VOICE_WORD_READ: "VOICE_WORD_READ",
  VOICE_MISCUE_DETECTED: "VOICE_MISCUE_DETECTED",

  // Speed drill
  SPEED_DRILL_COMPLETED: "SPEED_DRILL_COMPLETED",

  // Diagnostic
  DIAGNOSTIC_STARTED: "DIAGNOSTIC_STARTED",
  DIAGNOSTIC_COMPLETED: "DIAGNOSTIC_COMPLETED",

  // Autopilot interactions
  AUTOPILOT_DECISION_APPLIED: "AUTOPILOT_DECISION_APPLIED",
  AUTOPILOT_DECISION_OVERRIDDEN: "AUTOPILOT_DECISION_OVERRIDDEN",

  // Engagement signals
  SESSION_STARTED: "SESSION_STARTED",
  SESSION_ENDED: "SESSION_ENDED",
  STREAK_INCREMENTED: "STREAK_INCREMENTED",

  // Parent / tutor signals
  PARENT_SUMMARY_OPENED: "PARENT_SUMMARY_OPENED",
  PARENT_ACTION_TAKEN: "PARENT_ACTION_TAKEN",
  TUTOR_ANNOTATION_ADDED: "TUTOR_ANNOTATION_ADDED",
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
```

### 4.4 Decision type vocabulary

`lib/decisions/decisionTypes.ts`:

```ts
export const DECISION_TYPES = {
  // Content generation
  ITEM_GENERATION: "ITEM_GENERATION",
  DISTRACTOR_GENERATION: "DISTRACTOR_GENERATION",
  DISTRACTOR_CRITIC: "DISTRACTOR_CRITIC",
  LESSON_GENERATION: "LESSON_GENERATION",
  PASSAGE_GENERATION: "PASSAGE_GENERATION",
  HERO_VIDEO_MATCH: "HERO_VIDEO_MATCH",

  // Scoring & grading
  TDA_SCORING: "TDA_SCORING",
  GIST_GRADING: "GIST_GRADING",
  ESSAY_FEEDBACK: "ESSAY_FEEDBACK",
  MISCUE_CLASSIFICATION: "MISCUE_CLASSIFICATION",

  // Autopilot
  AUTOPILOT_PLAN: "AUTOPILOT_PLAN",
  AUTOPILOT_PROGRESSION: "AUTOPILOT_PROGRESSION",
  AUTOPILOT_INTERVENTION: "AUTOPILOT_INTERVENTION",

  // Adult-facing generation
  PARENT_SUMMARY: "PARENT_SUMMARY",
  TUTOR_RECOMMENDATION: "TUTOR_RECOMMENDATION",
  AUTOPILOT_RATIONALE: "AUTOPILOT_RATIONALE",

  // Utility
  CONTENT_TAGGING: "CONTENT_TAGGING",
  STANDARD_ALIGNMENT_CHECK: "STANDARD_ALIGNMENT_CHECK",
} as const;

export type DecisionType = typeof DECISION_TYPES[keyof typeof DECISION_TYPES];
```

### 4.5 Indexes & retention enforcement

- Extend the voice-flywheel retention cron (`scripts/voice/enforce-retention.ts`) to also delete `StudentEvent` and `ModelDecision` rows whose `deleteAfterDate` has passed. Rename to `scripts/data-flywheel/enforce-retention.ts` and have the voice cron call into it.
- `inputHash` index on `ModelDecision` enables cache lookups (same input → same decision).
- `deleteAfterDate` index on both `StudentEvent` and `ModelDecision` enables efficient nightly purges.

---

## 5. Instrumentation Library

Two thin libraries that every event-producing code path calls. Keep them small, well-typed, and dependency-light.

### 5.1 `lib/events/recordStudentEvent.ts`

```ts
import type { EventType } from "./eventTypes";

export interface RecordStudentEventInput {
  studentUserId: string;
  eventType: EventType;
  context: Record<string, unknown>;
  response?: Record<string, unknown>;
  durationMs?: number;
  immediateOutcome?: "CORRECT" | "INCORRECT" | "PARTIAL" | "ABANDONED" | "SELF_CORRECTED" | "TIMED_OUT" | "SKIPPED";
  sessionId?: string;
  occurredAt?: Date;
}

export async function recordStudentEvent(input: RecordStudentEventInput): Promise<StudentEvent>;
```

Behavior:

- Resolves consent state for the student (Tier 1 vs Tier 2 from voice flywheel; default is Tier 1).
- Sets `retentionTier = "SERVICE"` and `deleteAfterDate = occurredAt + 90 days` unless the student has training-tier opt-in, in which case `retentionTier = "TRAINING"` and `deleteAfterDate = null`.
- Inserts the row; returns it.
- **Never blocks the calling request flow on capture failure.** Wrap in try/catch and log; do not throw upstream. A failed event capture must not break user-facing functionality.

### 5.2 `lib/decisions/withModelDecisionLogging.ts`

```ts
import type { DecisionType } from "./decisionTypes";

export interface ModelDecisionContext {
  decisionType: DecisionType;
  modelProvider: "OPENAI" | "ANTHROPIC" | "FINE_TUNED_LLAMA" | "RULE_BASED" | "IN_HOUSE_CLASSIFIER" | "HEURISTIC";
  modelName: string;
  modelVersion?: string;
  promptKey?: string;
  inputContext: Record<string, unknown>;
  studentEventId?: string;
  parentDecisionId?: string;
}

export interface ModelDecisionMetadata {
  inferenceMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export async function recordModelDecision<T>(
  ctx: ModelDecisionContext,
  fn: () => Promise<{ output: T; metadata?: Partial<ModelDecisionMetadata> }>,
): Promise<T>;
```

Usage example (wrapping an existing TDA scoring call):

```ts
// before
const score = await scoreTdaWithGpt(essay, exemplars);

// after
const score = await recordModelDecision(
  {
    decisionType: DECISION_TYPES.TDA_SCORING,
    modelProvider: "OPENAI",
    modelName: "gpt-4o-2024-08-06",
    promptKey: "tda-scoring-v3",
    inputContext: { essayWordCount: essay.length, exemplarSetId: exemplars.id, grade: 7 },
    studentEventId: essaySubmissionEvent.id,
  },
  async () => {
    const start = performance.now();
    const result = await scoreTdaWithGpt(essay, exemplars);
    return {
      output: result.score,
      metadata: {
        inferenceMs: Math.round(performance.now() - start),
        inputTokens: result.usage?.input,
        outputTokens: result.usage?.output,
        costUsd: estimateCostUsd("gpt-4o", result.usage),
      },
    };
  },
);
```

Behavior:

- Computes `inputHash` from `inputContext` (stable JSON hash, sorted keys).
- Inserts `ModelDecision` row with all metadata.
- Returns the wrapped function's output unchanged so callers don't have to refactor consumers.
- **Never blocks on logging failure** — same try/catch pattern as event recording.
- Captures full prompt text **only via `promptKey` reference**, never inline (prompt templates may contain PII concatenated from student data at call time).

### 5.3 Prompt template registry

`lib/prompts/registry.ts` — when a prompt is used, its template (with placeholders, not filled values) is registered with a stable key. The decision logs the key only. Actual filled prompts are not stored. This protects PII and keeps the decision table searchable by prompt version.

---

## 6. New & Updated Routes

All admin-only. Use existing auth/rateLimit patterns.

| Route | Component | Purpose |
|---|---|---|
| `app/admin/events/page.tsx` | `components/admin/events/EventExplorerPage.tsx` | Filter and inspect student events by type, student, date range. |
| `app/admin/events/[eventId]/page.tsx` | `components/admin/events/EventDetailPage.tsx` | Drill into one event: context, response, related decisions, computed outcomes. |
| `app/admin/decisions/page.tsx` | `components/admin/decisions/DecisionExplorerPage.tsx` | Filter and inspect model decisions by type, provider, model, date range. |
| `app/admin/decisions/[decisionId]/page.tsx` | `components/admin/decisions/DecisionDetailPage.tsx` | Drill into one decision: inputs, output, cost, outcomes, chained child decisions. |
| `app/admin/data-flywheel/exports/page.tsx` | `components/admin/dataflywheel/ExportPanel.tsx` | Create and review `EventExportBatch` exports. |
| `app/admin/data-flywheel/model-comparison/page.tsx` | `components/admin/dataflywheel/ModelComparisonPanel.tsx` | Compare same-decision-type rows across providers/models on cost, outcome score, latency. Foundation for A/B testing fine-tuned models later. |

All routes gated to `ADMIN` role.

---

## 7. API Endpoints

All under `app/api/`. All admin-only unless noted.

| Method + Path | Purpose | Auth |
|---|---|---|
| `GET /api/admin/events?eventType=&studentUserId=&from=&to=&limit=` | List events with filters | Admin |
| `GET /api/admin/events/:id` | Get single event with outcomes and related decisions | Admin |
| `GET /api/admin/decisions?decisionType=&modelProvider=&from=&to=&limit=` | List decisions with filters | Admin |
| `GET /api/admin/decisions/:id` | Get single decision with outcomes and chain | Admin |
| `POST /api/admin/data-flywheel/exports` | Create an `EventExportBatch` | Admin |
| `GET /api/admin/data-flywheel/exports` | List recent batches | Admin |
| `GET /api/admin/data-flywheel/exports/:id/manifest` | Download JSONL manifest | Admin |
| `GET /api/admin/data-flywheel/model-comparison?decisionType=&from=&to=` | Aggregate stats by model for a decision type | Admin |

### Internal jobs (not HTTP endpoints)

- `scripts/data-flywheel/compute-outcomes.ts` — nightly. Backfills outcomes onto events and decisions whose downstream signals are now measurable (24h mastery delta computed at +24h, 7d retention at +7d, etc.).
- `scripts/data-flywheel/enforce-retention.ts` — nightly. Deletes events and decisions past `deleteAfterDate`. (Replaces / absorbs the voice-flywheel retention cron.)

---

## 8. Outcome Computation

Outcomes are the most strategically valuable part of this spec. An event or decision without an outcome is just data; with an outcome it becomes training signal.

### 8.1 Event outcomes

| `outcomeType` | What it measures | When computed |
|---|---|---|
| `MASTERY_DELTA_24H` | Change in relevant strand/standard score 24 hours after the event | At event_time + 24h |
| `MASTERY_DELTA_7D` | Same but over 7 days | At event_time + 7d |
| `RETENTION_PASS_7D` | Did the student pass the same standard / phonogram / item type 7 days later? | At event_time + 7d |
| `RETENTION_PASS_30D` | Same at 30 days | At event_time + 30d |
| `FOLLOWUP_PASS` | Did the next progress check on the same standard pass? | When the next check occurs |
| `STANDARD_PROGRESSION` | Did the student advance to a downstream standard within 14 days? | At event_time + 14d |
| `TUTOR_ANNOTATION` | Did a tutor mark this event/related lesson "stuck" or "ready to advance"? | When tutor annotates |
| `PARENT_ENGAGEMENT` | Did the parent open the summary that referenced this event? | When parent opens summary |

### 8.2 Decision outcomes

| `outcomeType` | What it measures | When computed |
|---|---|---|
| `DOWNSTREAM_MASTERY` | Did the student improve on the target standard after this decision was applied? | At decision_time + 7d |
| `TUTOR_OVERRIDE` | Did a tutor override this decision? | When override occurs |
| `STUDENT_FOLLOWUP_PASS` | Did the student pass the next check the decision led them to? | When check occurs |
| `QA_FLAG` | Was this decision flagged by an admin or QA review as incorrect/poor? | On flagging |
| `PARENT_ACTION` | Did the parent take action after a parent-summary decision? | When parent acts |
| `DISTRACTOR_SELECTION_RATE` | How often did students pick this generated distractor? | Aggregated weekly |
| `HUMAN_PREFERENCE` | A/B preference score from human review of two competing decisions | On manual review |

### 8.3 Computation pattern

The cron job is **idempotent and time-windowed**:

```
For each outcome type:
  Find events/decisions whose computation window is now closed
    AND that don't yet have an outcome of this type recorded
  Compute the outcome
  Insert a StudentEventOutcome or ModelDecisionOutcome row
  Skip if it already exists (idempotent)
```

Outcomes that depend on external signals (tutor annotation, parent action) are written by the relevant action handler, not by the cron. The cron only handles time-windowed automatic outcomes.

---

## 9. Privacy & Consent

### 9.1 Two-tier model — same as voice flywheel

Every `StudentEvent` and `ModelDecision` row carries a `retentionTier`:

- **`SERVICE`** (default) — 90-day retention. Used for normal operation, immediate outcome computation, and short-term active learning.
- **`TRAINING`** — extended retention, used in `EventExportBatch` outputs with `purpose != "DEBUG"`. Requires parent opt-in via the voice-flywheel consent surface (which extends to all data, not just voice).
- **`NONE`** — write-and-discard; the row gets `deleteAfterDate = occurredAt`. Used when the family disables data retention entirely.

### 9.2 Consent surface extension

The voice-flywheel `VoiceConsent` model becomes the **canonical consent surface for the whole platform** in this spec. Rename in copy/UX (but not in schema) to "Data settings" rather than "Voice settings" in the parent UI. The opt-in tier covers all flywheels — voice, item response, lesson effectiveness, etc.

Add a field to `VoiceConsent`:

```prisma
// Add to VoiceConsent
generalDataRetained        Boolean   @default(true)   // Tier 1 default-on for service-tier event retention
generalDataRetentionDays   Int       @default(90)
```

Parent UI surfaces both voice retention and general-data retention as separate toggles (so a parent who's uncomfortable with audio can still keep behavioral data, and vice versa).

### 9.3 PII handling

- `contextJson`, `responseJson`, and `inputContextJson` may contain IDs but **must not contain free-text PII**. Student name, parent email, etc. are referenced by ID only.
- Free-text essays and transcripts (which inherently are student work) are stored on the underlying entity (`Essay`, `VoiceSession`) and referenced by ID from the event row, not duplicated into `responseJson`.
- Prompt templates registered in `lib/prompts/registry.ts` may contain placeholders for student data but the filled prompts are never stored.

### 9.4 DSR handling

Extend `lib/dsrProcessor.ts` (existing) to:

- On account deletion: cascade-delete all `StudentEvent` and `ModelDecision` rows for the student, log to `VoiceAudioDeletionLog` (rename to `DataDeletionLog` if not too disruptive).
- On data export request: include all events and decisions tied to the student in the export.

---

## 10. Admin Event Explorer

The admin UI is for human inspection and exploratory analysis. Not a real-time dashboard.

### 10.1 Event explorer

- Filter by event type (multi-select), student, session, date range.
- Table view: time, student (anonymized to short ID), event type, immediate outcome, duration, has-decisions flag.
- Click into an event: see context, response, computed outcomes, related decisions chain.

### 10.2 Decision explorer

- Filter by decision type, model provider, model name, date range, cost range.
- Aggregates panel: total decisions, total cost, mean inference time, distribution by outcome score.
- Click into a decision: full input context, full output, costs, latency, child decisions (if a chain), outcomes.

### 10.3 Model comparison

- Pick a decision type.
- See aggregated stats per (`modelProvider`, `modelName`, `modelVersion`):
  - Count
  - Mean cost per decision
  - Mean inference time
  - Mean downstream outcome score
  - Mean human preference (if reviewed)
- **This is the panel that justifies LLM swaps later.** When a fine-tuned Llama matches GPT-4o on outcome score at 10% of the cost, you switch.

---

## 11. Wrapping Existing Calls (Initial Set)

To prove the foundation works end-to-end, wrap five high-value LLM call sites in this spec. Do not change their behavior — just wrap them with `recordModelDecision`:

1. **TDA scoring** — `lib/essayGrader.ts`. High-value because it has PSSA exemplar ground truth, so outcome attribution is strong.
2. **Distractor generation** — `lib/lessonGeneratorV2.ts` distractor path. Pairs naturally with the existing distractor pedagogy audit script as a quality signal.
3. **Distractor critic** — same file's critic path. Captures the existing "is this distractor good?" judgments as training data.
4. **Gist grading** — wherever short-answer gist grading happens. Cheap, frequent, will produce volume fast.
5. **Hero video match** — `lib/lessonImageGeneration.ts` or wherever the AI verifier lives. Useful because the AI verifier was itself recently added; capturing its decisions is straightforward.

Each wrap is ~10 lines of code. Total work for the initial five: ~1 day.

Also wrap the first event capture site: **item answer submission**. This gives you `ITEM_ANSWER_SUBMITTED` events flowing immediately, which is the highest-volume training signal.

---

## 12. Acceptance Criteria

### Schema & instrumentation

- Migrations apply cleanly and the five new models exist with correct indexes.
- `recordStudentEvent` and `recordModelDecision` exist, are typed, and never throw upstream on capture failure.
- The prompt registry exists and at least three prompts are registered with stable keys.

### Initial wrap-ins

- TDA scoring writes a `ModelDecision` row with non-null `costUsd` and `inferenceMs`.
- Distractor generation writes a `ModelDecision` row linked (via `parentDecisionId`) to its critic call.
- Gist grading writes a `ModelDecision` row.
- Hero video match writes a `ModelDecision` row.
- Item answer submission writes a `StudentEvent` row with `eventType = ITEM_ANSWER_SUBMITTED`, correct context, and the correct `immediateOutcome`.

### Consent

- `VoiceConsent` carries `generalDataRetained` and `generalDataRetentionDays`.
- A student whose parent has not opted in to training tier has events with `retentionTier = "SERVICE"` and `deleteAfterDate = occurredAt + 90 days`.
- A student whose parent has opted in to training tier has events with `retentionTier = "TRAINING"` and `deleteAfterDate = null`.
- Disabling general-data retention sets `retentionTier = "NONE"` and `deleteAfterDate = occurredAt`.

### Outcome computation

- The cron computes `MASTERY_DELTA_24H` on events that are now ≥24h old and don't have that outcome yet.
- Computed outcomes are idempotent — re-running the cron does not produce duplicates.

### Retention

- The retention cron deletes events and decisions whose `deleteAfterDate` has passed.
- Deletion is logged.

### Privacy

- No free-text student PII appears in any `contextJson`, `responseJson`, or `inputContextJson` payload.
- Account deletion via DSR cascades to all events and decisions for the account.

### Admin UI

- Admin can list, filter, and inspect events and decisions.
- Model comparison panel returns sensible aggregates for at least one wrapped decision type.

---

## 13. Test Strategy

- **Unit tests** for: event consent resolution, decision input-hash stability, outcome cron idempotency, retention cron deletion logic, prompt-template registry lookup.
- **Integration tests** for: each wrapped LLM call produces a correctly-shaped `ModelDecision`; item answer submission produces a correctly-shaped `StudentEvent`; export endpoint respects consent tier; admin endpoints gate non-admin users.
- **End-to-end test** for: complete a diagnostic → events flow → outcomes compute → export creates valid JSONL manifest with consent-honoring filter.
- **Manual QA** for: admin event/decision explorers feel inspectable, not a wall of JSON.

---

## 14. What Codex Should NOT Do

1. **Do not change behavior of existing LLM calls.** Only wrap. The wrapped function's output must equal the unwrapped function's output for the same input.
2. **Do not store free-text student PII in `contextJson`, `responseJson`, or `inputContextJson`.** Use IDs; the underlying entity holds the content.
3. **Do not store filled prompts.** Only `promptKey`. Filled prompts may contain student PII that's already in another table.
4. **Do not block user-facing flows on event/decision logging failure.** Capture must be best-effort and non-blocking.
5. **Do not introduce new event or decision types beyond §4.3 and §4.4 in this spec.** Future flywheel specs add their own.
6. **Do not train any model.** This spec only captures.
7. **Do not expose event/decision data to non-admin users.** The admin UI is admin-gated.
8. **Do not write to `StudentEventOutcome` or `ModelDecisionOutcome` synchronously from event-producing code paths.** Outcomes are written by the outcome cron or by dedicated action handlers (tutor override, parent action), never inline.

---

## 15. Suggested Implementation Order

1. **Schema migration** — add `StudentEvent`, `StudentEventOutcome`, `ModelDecision`, `ModelDecisionOutcome`, `EventExportBatch`; extend `VoiceConsent` with `generalDataRetained` and `generalDataRetentionDays`.
2. **Event/decision libraries** — `lib/events/eventTypes.ts`, `lib/events/recordStudentEvent.ts`, `lib/decisions/decisionTypes.ts`, `lib/decisions/withModelDecisionLogging.ts`, `lib/prompts/registry.ts`.
3. **Consent extension** — extend `VoiceConsentSettings` UI to surface general-data retention toggle. Rename UX copy to "Data settings."
4. **First wrap: TDA scoring.** Smallest behavior-preserving change to validate the pattern.
5. **First event: `ITEM_ANSWER_SUBMITTED`.** Validate event capture end-to-end.
6. **Remaining wraps** — distractor generation, distractor critic, gist grading, hero video match.
7. **Outcome computation cron** — start with `MASTERY_DELTA_24H` and `RETENTION_PASS_7D`. Add more outcome types as flywheels need them.
8. **Retention cron** — extend the voice-flywheel retention cron to events and decisions.
9. **Admin event explorer + decision explorer** — minimum-viable list + detail views.
10. **Export tooling** — `EventExportBatch` create/list/manifest endpoints + UI.
11. **Model comparison panel** — aggregated stats by model.
12. **DSR extension** — cascade-delete events/decisions on account deletion.
13. **Tests + manual QA** — see §13.

Total estimated effort: ~3-4 weeks of focused engineering. Steps 1-6 can ship in week 1 and start producing data immediately. Steps 7-11 land over weeks 2-3. Tests and DSR in week 4.

---

## 16. Roadmap (Future Specs This Unlocks)

Documented here so the architecture supports them without retrofit:

- **`specs/item-response-flywheel-codex-spec.md`** — distractor quality scoring + first specialized model (distractor critic) trained on `DISTRACTOR_GENERATION` decisions with `DISTRACTOR_SELECTION_RATE` outcomes.
- **`specs/tda-scoring-model-codex-spec.md`** — specialized TDA scoring model trained on `TDA_SCORING` decisions with PSSA exemplar ground truth.
- **`specs/lesson-effectiveness-flywheel-codex-spec.md`** — train lesson generation on `LESSON_GENERATION` decisions filtered by downstream `FOLLOWUP_PASS` outcomes.
- **`specs/autopilot-policy-flywheel-codex-spec.md`** — turn `AUTOPILOT_*` decisions + their outcomes into RLHF training data for a learned autopilot.
- **`specs/parent-summary-flywheel-codex-spec.md`** — train a small parent-summary generator on `PARENT_SUMMARY` decisions filtered by `PARENT_ACTION` outcomes.
- **`specs/llm-cost-reduction-roadmap.md`** — strategic doc tracking the path from "every call is GPT-4o" to "<10% of calls hit a frontier API."

---

## 17. Open Questions for Jonathan (resolve before Codex starts)

1. **Consent UX wording.** Should the parent-facing toggle for general data retention sit alongside voice retention in a single "Data settings" page, or be a separate "Behavioral data" toggle? *Recommend: single "Data settings" page with two grouped toggles — voice retention and general data retention — plus the training-corpus opt-in card.*
2. **Cost attribution accuracy.** OpenAI and Anthropic both expose usage on each response. Should `costUsd` be computed from current pricing (which drifts) or stored as a token count + provider+model and computed at read time? *Recommend: store tokens + provider+model, compute at read time. Keeps history accurate as prices change.*
3. **Event volume estimate.** At 1,000 active students × 30 events/day average, that's ~30K events/day or ~11M/year. Need to confirm DB sizing and indexing strategy works at that scale. *Recommend: provision for 50M events/year, partition by month if growth exceeds, plan archive-to-cold-storage after 18 months.*
4. **Should we wrap every existing LLM call in this spec, or only the initial five?** *Recommend: initial five only. Comprehensive wrap is a follow-on cleanup spec — fixing in-flight code is risky during foundational work.*
5. **Personally identifiable training corpus disclaimer.** When exporting a `TRAINING` batch, do we require manual admin confirmation that the export will be used only for in-house training? *Recommend: yes, plus an audit log entry listing the admin user and export purpose.*

---

**End of Data Flywheel Foundation v1 spec.**

This spec is the foundation. Every per-flywheel spec (item response, lesson effectiveness, autopilot policy, parent summary, TDA scoring, miscue classifier, etc.) becomes a small additive document on top of this one. Together they are the path from "AI-assisted product running on GPT-4o" to "AI-native product with proprietary models trained on its own data."
