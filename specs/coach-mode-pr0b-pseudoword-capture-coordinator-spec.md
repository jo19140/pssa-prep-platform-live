# PR-0B · PseudowordCaptureCoordinator · Codex spec (v5, LOCKED — post-Jonathan review pass 4)

**Date:** 2026-06-24 · Verified against `origin/main` (post-PR-0A `c8d2a01` + spelling fix `38b2bc1`). Part of the stepper plumbing chain ([[project_coach_mode_stepper_redesign]]); architecture: `specs/coach-mode-stepper-architecture-spec.md` (PR-0B). **No stepper, no UI change** — invisible plumbing.
**Sequencing:** on fresh `main` after PR-0A + spelling fix (both merged). **Prerequisite (do first):** re-read `ListenForReadingAttempt` (`components/literacy/StudentPracticeSession.tsx:793`) and `lib/voice/captureClient.ts` on current `main`; if the capture shape below differs, **STOP and report**.

## The bug — fire-and-forget capture races the session id (grounded)
`ListenForReadingAttempt` owns `voiceSessionIdRef` (`:837`), reused across pseudowords. In `completeHeard` (`:909`), a successful pseudoword read fires the capture **fire-and-forget** and only sets the id in the `.then`:
```ts
void capturePseudowordClip({
  blob, voiceSessionId: voiceSessionIdRef.current, lessonTargetCode,
  expectedText: word, wordIndex: words.indexOf(word), speakerAgeBand: undefined, clipDurationMs,
}).then((result) => { if (result?.voiceSessionId) voiceSessionIdRef.current = result.voiceSessionId; });
```
If the learner completes a **second** pseudoword before the first POST resolves, the second send also reads `voiceSessionIdRef.current === null` → the server (`/api/voice/capture/pseudoword`) mints a **second** VoiceSession. Result: the pseudoword `LabeledVoiceSegment`s scatter across multiple sessions instead of one. `voiceSessionIdRef` alone cannot fix this — there is no serialization between the in-flight response and the next send.

## What is and isn't frozen
**Frozen (student-observable):** VAD listen/heard detection, attempt counting, fallback, encouragement/Harper messaging, advancement, `confirmPseudowords`/`pseudowordAttemptMeta` telemetry — **byte-unchanged.** The capture stays **non-blocking** from the student's view (they keep tapping; nothing waits on a POST).
**Intentionally corrected (internal plumbing, the whole point of PR-0B):** pseudoword clips for one pseudoword block now share **one** VoiceSession id via **serialized** sends. This is a session-grouping fix, not a change to any reading interaction — do not treat it as a freeze violation.

## The coordinator — `lib/voice/pseudowordCaptureCoordinator.ts` (NEW, framework-free)
Owns the `voiceSessionId`, an in-flight promise chain (serialized sends), and a **background-upload pending** count. Inject the sender for testability (default = `capturePseudowordClip`).
```ts
export type PseudowordCaptureClip = Omit<PseudowordClipCaptureInput, "voiceSessionId">;
//  = { blob; lessonTargetCode; expectedText; wordIndex; speakerAgeBand?; clipDurationMs }

export type PseudowordSender =
  (input: PseudowordClipCaptureInput) => Promise<{ voiceSessionId?: string } | null>;

export class PseudowordCaptureCoordinator {
  constructor(opts?: { send?: PseudowordSender });   // default send = capturePseudowordClip
  enqueue(clip: PseudowordCaptureClip): void;        // returns immediately; serialized internally
  hasPending(): boolean;                             // background uploads in flight > 0
  subscribePending(listener: (pending: boolean) => void): () => void;
  whenIdle(): Promise<void>;                         // resolves when pendingCount reaches 0
}
```
**`hasPending`/`subscribePending` are BACKGROUND-UPLOAD state, NOT learner-interaction busy.** They exist for telemetry/flush — they must **never** gate stepper Next/Back (recording/VAD/TTS interaction-busy is a *separate* signal, owned elsewhere). Capture stays fire-and-forget from the learner's view; word-to-word advancement never awaits `whenIdle`.

Serialization contract:
- `enqueue` appends to a single promise chain: send link N **does not start** until link N-1 settles. The sender is always called with the coordinator's **current** `voiceSessionId` (read at send time, after the prior link may have set it).
- `enqueue` never throws and never rejects to the caller (fully fire-and-forget).
- `hasPending()` counts **queued plus actively-sending** clips (not merely active network requests) — true from the moment a clip is enqueued until its send link settles.

**Session-ID monotonicity (prevents session *spreading within one block* — NOT cross-block isolation):**
- a `null`/`undefined`/missing result **never clears** a known id;
- the **first nonempty** id becomes the block's **canonical** id;
- a later **matching** nonempty id is accepted (no-op);
- a later **conflicting** nonempty id must **not** replace the canonical id (a conflict signals an upstream anomaly; retaining the canonical value stops further spreading).

**Block isolation is a SEPARATE guarantee, from coordinator ownership — one fresh coordinator instance per pseudoword block.** Monotonicity alone does not isolate blocks; if a coordinator were wrongly reused across blocks, retaining its canonical id would *cause* cross-block leakage. The current scrolling mount IS the block boundary (one coordinator per `ListenForReadingAttempt` mount). **PR-C must construct a fresh owner whenever the lesson/block changes.**

**Metadata snapshot at enqueue (defensive):** the coordinator snapshots each clip's scalar fields (`lessonTargetCode`/`expectedText`/`wordIndex`/`speakerAgeBand`/`clipDurationMs`) at `enqueue` time — mutating the caller's input object while it waits behind another send must not change the eventual sender input. (The component passes a fresh literal today, so this is defensive, not a behavior change.)

**Failure behavior (must swallow all three, restore pending state, never block later clips):** a sender that resolves `null`, rejects, or throws synchronously does **not** stop the chain — the next clip still sends (with whatever `voiceSessionId` is known). `whenIdle` never rejects.

**One-session guarantee — stated honestly:** *successfully acknowledged* captures in one block share one VoiceSession (after the first response returns an id, all later serialized sends reuse it). It is **not** absolute under response loss — `capturePseudowordClip` returns `null` on a non-OK/caught response (and has no request timeout), so if the first response is lost the server may have created a session the client never learned, and the next send may mint another. True idempotency under loss needs a **server-issued block key** — out of scope (later reliability PR). **Do NOT add `Promise.race` timeout-and-continue here:** a late first request could still create a session and reintroduce splitting; full FIFO head-of-line behavior is intentional (a never-settling sender holding later clips is the accepted tradeoff for correct grouping).

**`whenIdle` precise semantics:** resolves only when `pendingCount === 0`; work enqueued while a caller is waiting is included until the *next* actual idle; resolves immediately if already idle; never rejects.

**`subscribePending` precise semantics:** immediately emits the current boolean on subscribe; thereafter emits **only** on `false→true` and `true→false` transitions (a second `enqueue` while already pending does **not** re-emit `true`); a throwing listener cannot make `enqueue` throw or corrupt the queue; `unsubscribe` is idempotent. Two immediate clips → emitted sequence `[false, true, false]`.

## Component rewire — `ListenForReadingAttempt` (with external ownership seam)
**The coordinator must be injectable** so the future one-word-per-screen stepper can create ONE coordinator above all nonsense-word screens and pass it into each one-word interaction — otherwise each remounted one-word component makes its own coordinator and the continuity bug returns. PR-0B adds the seam; the scrolling player uses a stable internal fallback.
- Add an optional prop: `captureCoordinator?: PseudowordCaptureCoordinator;`.
- **Pin the coordinator identity once per mounted block** (a bare `captureCoordinator ?? ownedRef.current` would let the active coordinator change if the prop changes mid-mount and split one block across coordinators):
```ts
const activeCoordinatorRef = useRef<PseudowordCaptureCoordinator | null>(null);
if (!activeCoordinatorRef.current) {
  activeCoordinatorRef.current = captureCoordinator ?? new PseudowordCaptureCoordinator();
}
const coordinator = activeCoordinatorRef.current;
```
Contract: the coordinator identity stays **stable for the block**; create a new coordinator per new pseudoword block/lesson; never reuse one across unrelated blocks or target codes.
**Do NOT** dispose/abort the coordinator on effect cleanup — an effect-cleanup dispose reintroduces the PR-0A Strict-Mode class of bug. No `AbortController` on unmount. Persistence claim, stated honestly: **pending sends are not cancelled by React component cleanup and may continue after an in-app component unmount; this does NOT guarantee survival across a browser refresh, tab close, process termination, or full-page navigation** (no client-only promise queue can).
- Remove `voiceSessionIdRef` (`:837`) and the fire-and-forget block (`:935-945`); replace with:
```ts
if (blob && lessonTargetCode) {
  coordinator.enqueue({
    blob, lessonTargetCode, expectedText: word,
    wordIndex: words.indexOf(word), speakerAgeBand: undefined, clipDurationMs,
  });
}
```
- Everything else in `completeHeard` and the file is unchanged. The player must not introduce the literal string `"VoiceSession"` (layer-2 invariant `:35`) — reference only `coordinator.enqueue`.

**Ownership contract:**
- Current scrolling block: uses the internally-owned fallback coordinator (one per `ListenForReadingAttempt` mount = one per pseudoword block — correct today).
- Future stepper: creates one coordinator above all nonsense-word screens and injects it via `captureCoordinator` into each one-word interaction. **Do NOT create one coordinator per future word screen.**
- `subscribePending` is **not** wired to any UI in PR-0B (keeps it invisible).

**What the seam does NOT solve yet (do not claim full one-word readiness):**
- **`ListenForReadingAttempt` remains file-local in PR-0B** — the injection seam adds coordinator ownership, but does NOT make the interaction importable by `LessonStepper`. Before stepper activation, **PR-C must extract/reuse the interaction component without duplicating its VAD/capture logic.** PR-0B is stepper-*enabling* plumbing, not complete one-word integration.
- **`wordIndex` collapses on one-word screens:** capture metadata still uses `wordIndex: words.indexOf(word)`; on a one-word screen `words` has length 1, so this is `0` for every nonsense word. PR-0B solves coordinator/session ownership only. The source-index fix (e.g. optional `captureWordIndexBase?` so `wordIndex = base + words.indexOf(word)`) is **deferred to PR-C and must be added before stepper activation.**

## Tests
**Coordinator test (the core)** — `scripts/test-pseudoword-capture-coordinator.ts`, `test:pseudoword-capture-coordinator`. Inject a controllable `send` returning manually-resolved deferreds. Assert:

*Initial:* `hasPending()` false; `whenIdle()` resolves immediately.

*Two immediate clips (A then B before A resolves):* `enqueue` returns immediately; A's sender starts, B's has **not**; A's send received `voiceSessionId: null`; all A clip metadata/blob fields preserved.

*After A resolves `{voiceSessionId:"vs-1"}`:* B's send starts and received `voiceSessionId: "vs-1"`; all B fields preserved.

*Drain:* exactly **two sender CALLS** total — this proves serialization + id reuse, **NOT** database rows (DB grouping is the manual smoke); `hasPending()` false; `subscribePending` emitted exactly `[false, true, false]`.

*Late-enqueue / whenIdle correctness:* enqueue A → call `whenIdle()` → enqueue B while A pending → resolve A → assert `whenIdle` **still pending** → resolve B → assert `whenIdle` resolves (proves pendingCount-based, not tail-based).

*Re-use after idle:* enqueue again after the coordinator returned to idle → a fresh pending true→false cycle.

*Failure (each must continue the chain, restore pending, not escape `enqueue`):* sender resolves `null`; sender rejects; sender throws synchronously. `whenIdle` never rejects.

*Session-ID monotonicity:* A→`vs-1`, B→`vs-1`, drain to idle, then enqueue C → C's send receives `vs-1`; a later `null` result does **not** clear `vs-1`; a conflicting nonempty id does **not** replace the canonical `vs-1`.

*Subscription robustness:* a listener throwing during the immediate subscribe-time emission is isolated; a listener throwing during a pending transition is isolated (does not break `enqueue` or the queue); `unsubscribe` is idempotent; enqueue-after-idle emits a fresh `true→false` cycle and retains the canonical id.

*Metadata snapshot (makes the snapshot contract executable):* enqueue A (keep unresolved); enqueue B from a **mutable** input object; after enqueue, mutate B's `expectedText`/`wordIndex`/`speakerAgeBand`/`clipDurationMs`/`lessonTargetCode`; resolve A; assert B's sender received the **original enqueue-time** scalar values and the **original `Blob` reference**.

*Block isolation (makes "fresh coordinator per block" executable):* coordinator A learns canonical `vs-1` and retains it after idle; construct a **distinct** coordinator B; assert `B !== A`, B's first sender call receives `voiceSessionId: null`, and no session state crosses instances.

*whenIdle reentrancy (optional, specified for strongest contract):* a pending listener that enqueues C during the `true→false` transition notification must **not** let a previously-waiting `whenIdle` resolve until C settles.

**`test:voice-capture-layer2` invariant update (REQUIRED — not a relaxation).** Line 34 today asserts `player.includes("capturePseudowordClip")`; the direct call is moving into the coordinator, so update **only** that invariant to follow the real path. The revised test must read the new coordinator source and assert:
- `StudentPracticeSession`: **contains** `PseudowordCaptureCoordinator`; **contains** `coordinator.enqueue`; **does NOT contain `voiceSessionIdRef`**; **does NOT directly import or call `capturePseudowordClip`**; preserves the `trainingCaptureEnabled === true && surface === "pseudoword"` gate (line 31); preserves `startClipRecorder(handle.stream)` (line 32); preserves `blob = await clipRecorder.stop()` on the heard path (line 33).
- `pseudowordCaptureCoordinator.ts`: imports `capturePseudowordClip` and uses it as the default sender.
- `captureClient`: still POSTs to `/api/voice/capture/pseudoword` (line 26, unchanged).
All other consent / private-storage / no-transcription / purge assertions (23–30, 35–54) stay unchanged in meaning.

**Full player diff review before merge (the race lives exactly here):**
```bash
git diff origin/main...HEAD -- components/literacy/StudentPracticeSession.tsx
```
Must show ONLY: the coordinator import, the optional `captureCoordinator` prop, the pinned `activeCoordinatorRef` resolution, **removal of `voiceSessionIdRef`**, and replacement of the fire-and-forget `void capturePseudowordClip(...).then(...)` block with `coordinator.enqueue(...)`. Nothing else.

**Gates (edits `StudentPracticeSession.tsx` — voice-invariant set mandatory):**
```bash
npm run test:pseudoword-capture-coordinator
npm run test:voice-capture-layer2          # updated invariant must pass
npx tsx scripts/test-voice-activity.ts
npm run test:scored-realword-controller
npm run test:spelling-flow                 # edits StudentPracticeSession.tsx after the spelling fix
npm run test:presentation-copy
npx tsc --noEmit
npm run build
git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx || true   # expect empty
```

**Manual two-word grouping smoke — TRUE MERGE GATE (the ONLY test of the full integration: real mic → VAD-confirmed blobs → serialized client calls → server session reuse → two DB segments in one session).** The coordinator unit test uses an injected sender and proves serialization + id reuse only; the P4A verifier passes on a single qualifying segment. Neither proves grouping. Procedure:
1. Hard-refresh and enter a **fresh** pseudoword block.
2. Record a **UTC baseline timestamp** before the first nonsense word.
3. Read **two** VAD-confirmed nonsense words.
4. In the Network panel, **wait for both pseudoword POSTs to finish successfully** (do not query the DB before the second serialized POST settles).
5. **PRIMARY PROOF:** record both response `voiceSessionId` values — they must be **equal**.
6. Confirm that exact `VoiceSession`: belongs to the **synthetic smoke student**; its `startedAt` is **at or after** the recorded UTC baseline (proves the session is **new for this block**, not an accidentally-reused older one); contains **≥2** `LabeledVoiceSegment` rows whose `createdAt` is at/after the baseline and whose `expectedText` values correspond to the **two words just read**.
7. **SECONDARY (corroborating, can be polluted by unrelated late requests):** only one new `VoiceSession` for that student after the baseline.
8. Run `npm run test:p4a-voice-smoke` — complementary invariant gate (proves private-key prefix, blank ASR transcript, consent state, phonogram/syllable metadata, queue eligibility). It needs only one qualifying segment so it **cannot replace** the grouping query, but both must pass.

(Read-only DB query — documented, not a code change. If you'd rather a machine gate, add an optional grouped mode to the P4A verifier — but then add that file to scope explicitly.)

**This gate blocks merge.** If browser auth, microphone, blob config, or DB access is unavailable, report exactly *"Automated gates green; human two-word grouping smoke pending"* — and **pending means DO NOT MERGE yet.** Jonathan runs it before landing. **Do not fake it.**

## Scope (files)
```
lib/voice/pseudowordCaptureCoordinator.ts            (NEW)
components/literacy/StudentPracticeSession.tsx        (ListenForReadingAttempt: + captureCoordinator prop, drop ref + fire-and-forget → coordinator.enqueue)
scripts/test-pseudoword-capture-coordinator.ts        (NEW)
scripts/test-voice-capture-layer2.ts                  (update ONLY the capturePseudowordClip invariant → coordinator path)
package.json                                          (test:pseudoword-capture-coordinator alias only)
```
Plus, in the full PR diff: this tracked spec **and** the reconciled `specs/coach-mode-stepper-architecture-spec.md` (PR-0B line: background-upload pending ≠ interaction-busy; one-session caveat). No other files → STOP and report.

## Guardrails
- Behavior-frozen on all reading interactions; only the capture session-id plumbing changes. Never alter VAD/heard/scoring/consent semantics; `trainingCaptureEnabled === true && surface === "pseudoword"` capture gate unchanged ([[reference_voice_speech_strategy]], private-blob/consent rules intact).
- Coordinator framework-free (no React import); component owns it via lazy ref, no effect-cleanup disposal.
- No stepper, no UI change, no new colors, raw-band grep stays zero ([[feedback_run_voice_invariant_gates]]).
