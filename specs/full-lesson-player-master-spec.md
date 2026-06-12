# Full content-v3 lesson player (8 parts) — master build spec

**Decided 2026-06-11 (Jonathan + Pro + Claude).** Build the complete student-facing 8-part structured-literacy lesson at `/student/practice`, rendering **real generated content-v3 data**, on the **V6 canonical design**. Validate on the **a_e** target first; the renderer reads generated output so it generalizes to the other 29 later. **Full lesson experience now; full speech scoring later, part by part, only where evidence supports it.**

Design references (do NOT invent new design): **`specs/mockups/full-lesson-player-mock.html` = the canonical full 8-part player mock (Jonathan-built, signed off 2026-06-11) — build to this.** It shows all 8 parts, the Part-3 ladder, listen-&-encourage 5/7, spelling tiles, adult controls, and a correct evidence-log model (retry_prompted on attempt 1, `VOICE_MISCUE_DETECTED` only on reteach). V6 = `specs/mockups/lesson-v6-preview.html` (underlying visual language). The earlier `part3-player-preview.html` is now a subset, superseded by the full mock. **The mock's specific words/sentences/story are illustrative — the real player renders them from `generatePartN` output, never hardcoded.** Reconcile rules = [[reading-buddy-lesson-runtime-reconcile-and-scaffold-spec]]. Strategy = [[asr-strategy]]. Evidence from [[asr-reality-check-RESULTS-voice-corpus-pilot]] (the Yohanna case) is WHY connected parts don't auto-score.

## Route & data

- Replace the `/student/practice` stub (`StudentPracticeSession`) with the real player; student-auth-gated, reachable only by an enrolled student.
- **Only `a_e` is enabled for FL-1/2/3.** If a `/student/practice/[target]` route is created, **non-a_e targets must return a safe "coming soon" / disabled state** unless that target has explicit `kidRuleStatement` + `reteachPrompt` fields. **Do NOT synthesize rule copy from `tutorLabel` or any adult label** — the only locked copy is a_e (the runtime needs per-target kid-facing copy, not derived-from-adult-labels copy).
- Render each part from the **real producer path** — `generateLessonDraft` / `generatePartN*` reading `LESSON_CONTENT_BY_DAILY_TARGET` (seed + `phase3EntryLessonContentFor`). **Do NOT hand-build any part's content.** You read generated `contentJson`; you do not modify the generator, gates, audits, or `lib/literacy`.
- Reuse `BuddyCharacter` (Harper), the `MicButton`/`lib/voice/audioCapture` path, and TTS (`lib/voice/tts`) for spoken directions. Harper is audio-first.

## Per-part behavior (LOCKED)

| Part | Name | Interaction | Scoring |
| --- | --- | --- | --- |
| 1 | Warm-up | kid reads warm-up words; Harper listens OR "I read it" tap | **no hard score** — listen/self-confirm, no harsh correction |
| 2 | New thing (concept/rule) | Harper *teaches* the rule (speaks `kidRuleStatement`); kid listens/repeats | **no score** |
| 3 | Word lines (decoding) | kid reads each real word → gpt-4o-transcribe match → retry/reteach ladder; pseudoword line = self/adult confirm | **scored — the live loop** (see below) |
| 4 | Power words | heart words + **the vocabulary word(s) the generated lesson emits** (do NOT hardcode a count); listen/repeat + simple tap recognition | **no hard score** |
| 5 | Sentences | kid reads sentences; Harper listens + encourages + advances | **listen & encourage, NO auto-score** |
| 6 | Spelling | spell-what-you-hear via **tiles/keyboard** | **scored on typed/tile response** (NOT ASR) |
| 7 | Story | Harper can read first ("Listen first" / "Read on my own"); kid reads; Harper listens + celebrates completion | **listen & encourage, NO word-level judgment** |
| 8 | Talk about it (comprehension) | tap/typed/open response UI (or process-and-drop voice if already available) — **no raw-audio persistence, no ASR scoring, no training/corpus capture** | **no auto-grade in v1** |

## Part 3 — the live scoring loop (the one scored speech part)

Exactly the signed-off mock (`part3-player-preview.html`). `PART3_SCORING_MODE` default `harper_retry_only` for isolated words.

- **Scoring:** normalized transcript == target (gpt-4o-transcribe authoritative; Web Speech never scores). **NO edit-distance** (cake↔cack is distance 1). **NO "you said ___"** echo — the pilot proved the miscue transcript is unreliable (soft reader → "K"/"Qué?").
- **Correct:** "Nice reading — that was *cake*." → mark correct, advance, emit `VOICE_WORD_READ` (CORRECT).
- **Mismatch attempt 1 / low confidence:** "Read that one more time for me." (no "wrong," no miscue event yet) — re-record.
- **Repeated mismatch:** rule reteach via the **locked a_e `reteachPrompt`**: "Look at the e at the end. It is quiet, but it helps a say its name. Try again: *{word}*." → emit `VOICE_MISCUE_DETECTED`.
- **Still stuck (attempt ≥3):** I-do/you-do — Harper says the word (TTS): "Listen: *cake*. Now you try." → `scoringMode:"assisted"`, `independentScoreEligible:false`, advance gently.
- **Pseudowords (Line 4):** framed "silly words," self/adult confirm, **never ASR-scored**.
- No red X, no harsh fail state, no auto-reject on first mismatch.

## Parts 5 & 7 — listen & encourage (NOT scored, NOT stored)

Connected text needs word-level alignment, which does not exist. So Harper **listens and encourages but does not judge**. **"Listen" here does NOT mean store audio.** For v1:

- Use a **listening animation** + (optionally) process-and-drop transcription if a listening cue is wanted — but **do NOT persist raw audio** and **do NOT score correctness**.
- Respond warmly ("I loved listening to you read that!"), advance, and emit a **completion event only** — no correctness verdict, no correction, no `VOICE_MISCUE_DETECTED`.

This protects soft/struggling readers (the Yohanna case) from being wrongly corrected on connected text, and keeps the student path's no-storage boundary clean (the local corpus capture harness is dev/probe only — NOT the student path). Connected scoring is a deferred PR that depends on the alignment layer.

## Locked a_e copy (Harper speaks this verbatim)

```
kidRuleStatement (Part 2): "When a word ends in a silent e, the e is quiet — but it makes the a say its name. Watch: cap turns into cape."
reteachPrompt   (Part 3): "Look at the e at the end. It is quiet, but it helps a say its name. Try again: {word}."
```

Source of truth for the *words*: `specs/phase2-kid-rule-copy-exemplars-DRAFT.md` (LOCKED).

**Where the fields LIVE (Option A — required; do not hardcode in UI, do not invent a shape):** add `kidRuleStatement: string` and `reteachPrompt: string` to the **content-v3 lesson-content type** and populate them on the **`a_e` entry** in `LESSON_CONTENT_BY_DAILY_TARGET`. Expose them through the generated **Part 2** (kidRuleStatement) and **Part 3** (reteachPrompt) output so the player reads them from generated data, not from UI constants. `{word}` is substituted at runtime in the player. This is **curriculum copy living with the content** — the right home, per the runtime-foundation gap (Part 2 emits `demoMode`/pairs but no kid-facing copy). It is a deliberately **scoped content addition**: the two fields + the a_e value + their pass-through in `generatePart2`/`generatePart3` — and **nothing else** (no generator-logic, gate, audit, decodability, or other-target changes).

## Evidence (existing pipes — do not reinvent)

`recordStudentEvent`: `LESSON_STARTED` on open; per Part-3 word attempt `VOICE_WORD_READ` {partNumber, lineRole, wordId, target, attemptNumber, asrVendor, confidenceProxy, uncertaintyScore; response: rawTranscript, normalizedTranscript, scaffoldStep, scoringMode; immediateOutcome}; `VOICE_MISCUE_DETECTED` ONLY on escalation to reteach (not first mismatch); `LESSON_STEP_COMPLETED` per part; `LESSON_COMPLETED` at end. Parts 5/7/8 emit a completion/response event with no correctness verdict. Feeds the existing teacher view — no new adult layer.

## Build sequence (reviewable PRs that SUM to the full lesson — do NOT ship as one drop)

This is the discipline that protects Codex budget + keeps each diff auditable. The end state is the full lesson; the path is chunked:

- **PR 2A — promote the transcribe route** (independent, security-sensitive, audited alone): `/api/voice/transcribe` admin→student-auth, drop prod-404, add upload size+duration cap, MIME allowlist (audio/webm,mp4,wav) **for transcription input only — this route writes NO file, so no extension is persisted** (unlike the dev corpus route which is webm-only because it saves), rate-limit, `ModelDecision` (decisionType `ASR_TRANSCRIPTION`, cost/latency only, never raw audio). **v1 process-and-drop, UNMISTAKABLE: transcribe in-session → return transcript → drop the blob. NO audio persistence, NO `VoiceCorpus` write, NO `VoiceSession` audio file, NO training storage.** The flywheel/dev-probe capture is a separate system; this route does not retain child audio.
- **PR FL-0 — copy fields (tiny, content-scoped):** add `kidRuleStatement` + `reteachPrompt` to the content-v3 content type + the `a_e` entry + their pass-through in `generatePart2`/`generatePart3`. No other change. (Unblocks Part 2 teaching copy and the Part-3 reteach.)
- **PR FL-1 — player shell + non-speech parts:** `/student/practice` renders the real generated lesson, part navigation + progress, Harper/TTS, and Parts **1, 2, 4, 6, 8** fully (Part 6 spelling scored by tiles/keyboard). **Part 1 in this PR = visual + Harper guide + tap/"I read it" self-confirm — NO live mic / NO ASR scoring** (don't quietly start scoring before the route is promoted and audited). Evidence: `LESSON_STARTED`/`STEP_COMPLETED`/`COMPLETED`. No ASR scoring anywhere in this PR.
- **PR FL-2 — Part 3 live loop:** the scaffold ladder above, consuming the promoted route + the FL-0 copy. (Depends on 2A + FL-0 + FL-1.)
- **PR FL-3 — Parts 5 & 7 listen-encourage:** listening animation + completion event, no scoring, **no raw-audio persistence**. (Depends on FL-1.)

Each PR: `npx tsc --noEmit` + `npm run build`, and a stop-report. Audit each before merge. **Boundary check per PR:** byte-diff confirming no `lib/literacy` generator-logic, gate, audit, decodability, matcher, registry, or diagnostic changes. **FL-0 exception ONLY:** the exact data pass-through of `kidRuleStatement`/`reteachPrompt` through the existing Part 2/Part 3 generated-content shape is allowed — data plumbing only, with NO audit/gate/scoring/decodability behavior change.

## Out of scope (all later)

Sentence/story ASR scoring · word-level alignment · phoneme scoring · full autonomous mastery decisions · diagnostic handoff · teacher-dashboard rebuild · new lesson content · generator-logic/gate/audit/decodability changes · the other 29 targets' rule copy (a_e only for now) · flywheel audio capture on the student path.

**The ONE allowed content change** is PR FL-0: the two copy fields (`kidRuleStatement`, `reteachPrompt`) on the content type + a_e entry + their generatePart2/3 pass-through. Everything else in `lib/literacy`/generator/gates/audits stays untouched.

## Build prerequisites

**Must land first (preceding PRs in this series):** the promoted transcribe route (PR 2A) — *to be built + audited, not yet ready* — and the copy pass-through (PR FL-0). **Already in place:** locked a_e copy (done) · `generatePartN` producers (exist) · V6 + Part-3 mock (signed off) · `BuddyCharacter`/`MicButton`/TTS (built).
