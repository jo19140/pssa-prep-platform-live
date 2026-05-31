# Content v3 · Codex Implementation Spec

**Status:** Draft for Codex execution
**Author:** Jonathan Diaz (with Claude assistance)
**Date:** 2026-05-26
**Companion to:** `specs/reading-buddy-v1-codex-spec.md` (chassis), `specs/voice-data-flywheel-codex-spec.md` (voice consent + retention), `specs/data-flywheel-foundation-codex-spec.md` (ModelDecision instrumentation), `specs/voice-tts-upgrade-codex-spec.md` (production TTS)

---

## 1. Overview

This spec covers the **content engine** for Reading Buddy — the structured-literacy diagnostic and lesson generation system that turns the v1 chassis into an actual product a striving reader can use. It defines:

- The phase-based scope-and-sequence Reading Buddy teaches.
- The 6-strand comprehensive diagnostic that places students.
- The 8-part structured-literacy lesson architecture the system delivers.
- The content sourcing model (open-licensed passages + AI generation with pre-review).
- The validity, IP, and pre-launch QA discipline the content engine must enforce.

This is the spec that makes Reading Buddy a working literacy intervention product rather than an empty chassis. It is positioned as the foundation of a national K-8 literacy product (Sýnesis Learning / Reading Buddy on Venus), with PSSA-style state test prep handled by separate sibling modules.

---

## 2. Methodology Foundation

Reading Buddy's content engine is grounded in the Orton-Gillingham-based structured-literacy tradition synthesized across the field — including Wilson Reading System, UFLI Foundations, CKLA, Project Read, Recipe for Reading, Explode the Code, and Blevins's *Phonics from A to Z* — plus the research summarized in IES Practice Guide 21, the National Reading Panel report, and the National Center on Improving Literacy guidance.

**Critical IP discipline:** Reading Buddy uses methodology that is shared research tradition across the structured-literacy field. It does **not** ingest, reproduce, or paraphrase content from any specific commercial program. Wilson Reading System materials, CKLA lesson scripts, UFLI item lists, Curriculum Associates word lists, Blevins's specific word lists, and OG Academy morphology tables are all design references only. The content engine generates original word lists, sentences, passages, and items.

**Methodology vs. content boundary:**

| Free to adopt (methodology) | Never copy (specific content) |
|---|---|
| Phase-based scope-and-sequence ordering | Wilson's Step numbering, CKLA's Section labels |
| Six syllable types as linguistic categories | Wilson's specific word lists per Step |
| Real-word + nonsense-word pairing for decoding | Curriculum Associates' specific subtest items |
| Blending lines / contrastive word-list structure | Blevins's specific phonogram lists |
| 80% mastery criterion | UFLI's specific decodable passages |
| Hasbrouck-Tindal fluency norms (published) | Any program's lesson scripts |
| Open-licensed passages from StoryWeaver, GDL | Any commercial decodable readers |
| NDL 1.1 lemmatized HFW list (CC BY-SA 4.0) | Dolch list compilations under license |

---

## 3. Scope-and-Sequence: Two-Track, Seven Phases

Reading Buddy organizes instruction as two parallel tracks running through seven phases.

**Track A — Phonics / orthographic code.** Sound-symbol correspondences, syllable types, multisyllabic decoding.

**Track B — Morphology / meaningful word parts.** Base words, inflectional suffixes, derivational affixes, Latin and Greek roots.

**The seven phases:**

| Phase | Phonics focus (Track A) | Morphology focus (Track B) | Instructional goal |
|---|---|---|---|
| 0 | Oral phonemic awareness, letter names/shapes, first consonants and short vowels | Oral word meaning, simple word families, compound words orally | Hear sounds, connect speech to print, build first mappings |
| 1 | Basic alphabetic code: consonants, short vowels, VC/CVC words | Base word concept; simple plural -s and action -s when decodable | Decode and spell simple closed-syllable words |
| 2 | Digraphs (sh, ch, th, wh, ck, ng, nk), blends, final spelling patterns, closed syllables | Inflectional suffixes: -s, -es, -ing, -ed, -er, -est | Show that suffixes change meaning/grammar while the base stays meaningful |
| 3 | Long-vowel entry: silent-e (a_e then i_e then o_e then u_e then less-common e_e), open syllables, common long-vowel spellings | Transparent prefixes and suffixes: un-, re-, pre-, -ful, -less, -ly, -ness | Connect decoding, spelling, and meaning in longer words |
| 4 | Vowel teams, r-controlled vowels, diphthongs, variant vowel spellings | Suffix spelling changes: drop-e, double final consonant, change-y-to-i | Handle spelling changes without treating them as random exceptions |
| 5 | Syllable types and multisyllabic decoding; schwa instruction | Bases + affixes; compound words; common derivational suffixes | Decode longer words by syllable and morpheme |
| 6 | Advanced word study: schwa refinement, accent, less common patterns | Latin/Greek roots, combining forms, assimilated prefixes ("shape-shifting prefixes"), connective vowels (i, u, ol), advanced suffixes | Use morphology as a major strategy for reading, spelling, and vocabulary |

**Within-phase sub-positions.** Each phase has two functional starting points: **Entry** (initial introduction of the phase's target patterns) and **Mid** (consolidation and application within the phase). A diagnostic placement of "Phase 3 Mid" is more precise than "Phase 3" alone.

**Daily target discipline.** Each lesson teaches one specific pattern, not a category. "Silent-e" is too broad. The daily target is "a_e" or "i_e" or "o_e" — one vowel pattern at a time. This applies recursively: when a phase contains multiple sub-patterns (Phase 4's r-controlled vowels, for example), each sub-pattern gets its own lesson.

---

## 4. The 6-Strand Comprehensive Diagnostic

Reading Buddy uses a comprehensive 6-strand **instructional placement diagnostic** (not a validated screener) as the primary entry point, modeled structurally on the UK Phonics Screening Check (Open Government Licence) for the decoding component plus DIBELS / Acadience / NCII conventions for the other strands. The diagnostic runs 30-45 minutes and produces both a phase placement and a strand-priority ranking. "Instructional placement" — not "screener" — is the operative word, because Reading Buddy does not yet make validated norm-referenced claims (no above/below grade level, no risk classification). Validation language is reserved for a future spec that ships actual NCII-aligned validation evidence.

### 4.1 The six strands

1. **Phonemic awareness** — oral tasks (isolation, blending, segmentation, manipulation). Voice-captured responses, no print.
2. **Decoding** — adaptive real-word + pseudoword reading, sampled across phases 1-6. Determines the phase placement.
3. **Morphology** — base-word identification, suffix recognition, prefix recognition, multi-step morphology (advanced).
4. **Fluency** — timed connected-text oral reading. Words correct per minute (WCPM), accuracy percentage, prosody/phrasing notes. Compared to Hasbrouck-Tindal norms.
5. **Vocabulary** — receptive (image choice for concrete words, sentence choice for abstract Tier 2 words) and expressive.
6. **Comprehension** — listening comprehension (TTS reads passage; student answers) and reading comprehension (student reads, then answers). The gap between the two is diagnostically critical.

### 4.2 Phase placement rule

**Decoding strand determines the phase. Other strands inform priority emphasis within the phase.**

- A student who decodes Phase 2 patterns at ≥80% and Phase 3 patterns at <50% places at **Phase 2 Mid**.
- A student who decodes Phase 3 patterns at ≥80% and Phase 4 patterns at <50% places at **Phase 3 Mid**.
- Strand scores from PA, morphology, fluency, vocabulary, and comprehension are computed independently and surface as strand priorities (Priority 1 / 2 / 3 / Relative Strength), not as phase modifiers.

### 4.3 Routing vs. final placement

The diagnostic distinguishes between **routing** (which next item set to administer) and **final placement** (the committed phase determination).

- **Routing** decisions can use short item sets (2-3 items as evidence to branch up or down).
- **Final placement** requires sufficient evidence within a phase: a minimum of 5-8 scored items per phase being considered, including both real-word and pseudo-word evidence where applicable.

### 4.4 Adaptive ceilings within strands

Each strand has a within-strand adaptive ceiling: if a student misses **4 consecutive items at a phase level**, the sub-test stops probing higher phases within that strand. The strand still completes its minimum-evidence floor at lower phases. **All 6 strands are administered in every diagnostic.** The diagnostic does not skip strands based on early performance.

### 4.5 Per-item rules

- **Latency is recorded but does not auto-score.** Response time is captured on every decoding item. A response after 5 seconds is flagged `delayed` (feeds the fluency strand and the tutor view); a non-response after 10 seconds is scored as a no-attempt and the system advances. Decoding *placement* is determined by accuracy alone — accurate-but-slow students place on knowledge, not speed. Fluency/automaticity is the separate fluency strand's job.
- **No correctness feedback during scored items.** No green/red, no "correct/incorrect," no running score visible to the student.
- **One word per card** for decoding sub-test. The student does not see upcoming items.
- **Tap-to-start, tap-to-stop voice capture** standardized across all sub-tests.
- **Replay rules.** PA prompts: 1 replay allowed. Listening comprehension: 1 replay if untimed. Decoding: no replay (word is visible). Fluency: no restart unless audio fails.

### 4.6 Pre-diagnostic flow

Before any scored items, every student goes through:

1. **Microphone check** ("When you're ready, say 'sunshine'").
2. **Practice item** explicitly labeled as not counted ("This one doesn't count").

This protects validity by ensuring early scored items aren't measuring task confusion or audio setup problems.

### 4.7 Diagnostic outputs

The diagnostic produces:

- **`LiteracyProfile.currentPhase`** — phase placement (e.g., "Phase 2 Mid").
- **`StrandScore[]`** — per-strand 0-100 score plus `priorityRank` (1-6 for instructional priority within the placed phase).
- **`LiteracyProfile.confidenceScore`** — placement confidence with explanation ("High confidence: based on 34 scored items, clear audio on 33 of 34, stable performance across two adjacent phases").
- **"Why this placement" structured breakdown** — for each phase, list of skills marked Secure / Developing / Not Yet Secure with item counts.
- **Listening-vs-reading comprehension gap** — explicit comparison with interpretation ("On this diagnostic, Maya understood the listening passage more successfully than the passage she read independently. This suggests decoding and/or fluency may be limiting access to meaning").

### 4.8 Conservative language until norms validated

Until Reading Buddy has its own validated grade-norm dataset (or formal alignment to NCII-rated screeners for each strand), strand status uses **"Priority 1/2/3"** and **"Relative strength on this diagnostic"** framing, never "above grade level" or "below grade level." Fluency may use Hasbrouck-Tindal norms (published research, public reference) with explicit citation.

### 4.9 Diagnostic Results Computation Thresholds (v1)

These thresholds are canonical. PR #32 (and any future results-computation work)
must reuse them; do not invent new cutoffs without updating this section first.

#### 4.9.1 Pattern classification

For each decoding pattern within the placed phase:

```text
secure:
  scoredItems >= 4 AND accuracy >= 0.80

developing:
  scoredItems >= 3 AND accuracy >= 0.50 AND accuracy < 0.80

notYetSecure:
  scoredItems >= 3 AND accuracy < 0.50

insufficientEvidence:
  scoredItems < 3
```

Edge-case canonical test cases (PR #32 must include these as unit tests):

```text
2/2 -> insufficientEvidence
2/3 -> developing  (66.7%)
1/3 -> notYetSecure  (33.3%)
3/4 -> developing  (75%)
4/4 -> secure  (100%)
4/5 -> secure  (80%)
3/5 -> developing  (60%)
2/5 -> notYetSecure  (40%)
```

Instructional planning rule:

`decodingSecure` is true only when `status == "secure"`. `developing`, `notYetSecure`, and `insufficientEvidence` are all treated as not secure for first-lesson target selection.

Adult copy rule:

UI must not describe `insufficientEvidence` as a student weakness. It must be surfaced as "not enough evidence yet" or folded into the confidence explanation. Never as "not yet secure" in parent-facing copy.

#### 4.9.2 Confidence level

Inputs:

```text
totalScoredItems            — count of items where scored == true
                              (excludes practice items, no-attempt, audio-problem)
usableAudioFraction         — usableVoiceAttempts / totalVoiceAttempts
                              (denominator excludes selected-choice attempts)
strandsBelowMinimumEvidence — count of strands whose scored-item count is
                              strictly less than that strand's floor
strandsAtMinimumEvidence    — count of strands whose scored-item count equals
                              its floor exactly (no margin)
```

Note: items selected via low-confidence replacement count toward `totalScoredItems` if they were ultimately scored; the original unscored attempt does not.

Computed via precedence (first match wins):

```ts
if (
  totalScoredItems < 20 ||
  usableAudioFraction < 0.80 ||
  strandsBelowMinimumEvidence >= 3
) {
  return "low";
}

if (
  totalScoredItems >= 30 &&
  usableAudioFraction >= 0.90 &&
  strandsBelowMinimumEvidence === 0 &&
  strandsAtMinimumEvidence === 0
) {
  return "high";
}

return "medium";
```

#### 4.9.3 Listening-vs-reading interpretation

Only compute a gap interpretation if:

```text
listeningTotal >= 4 AND readingTotal >= 4
```

`gap = listeningPercent - readingPercent` (both expressed 0-100)

Bands:

```text
gap >= 25:
  "Listening comprehension is notably stronger than independent reading
  comprehension. This pattern is consistent with decoding and/or fluency
  limiting access to meaning."

15 <= gap < 25:
  "Listening comprehension is moderately stronger than reading comprehension.
  Continue decoding instruction and monitor reading-comprehension growth as
  automaticity develops."

-10 <= gap < 15:
  "Listening and reading comprehension are operating consistently on this
  diagnostic."

gap < -10:
  "Reading comprehension is stronger than listening comprehension on this
  diagnostic. Review listening-language evidence and continue monitoring."
```

If evidence floor is not met:

```text
"Not enough evidence yet to compare listening and reading comprehension."
```

#### 4.9.4 First lesson target selection

Within the placed `PhasePosition`:

1. Pull `DailyTarget`s ordered by `introductionOrder` ascending.
2. For each target, compute pattern status per §4.9.1 above.
3. The first lesson target = the lowest `introductionOrder` `DailyTarget` where status is NOT `"secure"` (i.e., `developing`, `notYetSecure`, or `insufficientEvidence`).
4. If all targets in the placed phase have `status == "secure"`: do NOT silently advance to the next phase. Recommend a review / consolidation target for the placed phase, and surface a tutor note "Student may be ready to advance — confirm via tutor review before promoting placement."

The "advance to next phase" decision must come from the autopilot loop (§5.13), not from first-lesson recommendation logic — that prevents the results dashboard from bypassing the original placement.

#### 4.9.5 Additional support

Generate up to 3 supports in this priority order (first 3 that match):

1. `confidence == "low"`:
   "Use the first full lesson cycle to confirm this starting point before making longer-term placement decisions."
2. `listeningVsReading.gap >= 25`:
   "Emphasize decoding and connected-text fluency. Use the listen-first scaffold for the lesson passage on the first day."
3. `strandPriority[0].strand == "PA"`:
   "Add extra phonemic-awareness warm-up before the target instruction."
4. `strandPriority[0].strand == "MORPHOLOGY"` OR `strandPriority[1]?.strand == "MORPHOLOGY"`:
   "Include morphology connections during target instruction (target word families with shared roots or affixes)."
5. `confidence == "medium"`:
   "Treat this placement as a starting hypothesis; confirm or adjust after the first 2 lessons."

#### 4.9.6 Structured evidence shaping

Every claim string carries an `evidence` field. Evidence objects use this shape:

```ts
{
  strand: "DECODING" | "PA" | "MORPHOLOGY" | "FLUENCY" | "VOCABULARY" |
          "LISTENING_COMPREHENSION" | "READING_COMPREHENSION",
  pattern?: string,    // e.g. "a_e" — required when claim is pattern-specific
  score: number,
  total: number
}
```

Per-claim conventions:

- `whyThisPlacement.{secure|developing|notYetSecure}[i].evidence`: Always `strand=DECODING` with `pattern` set to the specific pattern being classified.
- `parentFriendlySummary.evidence` (up to 3 entries, balanced):
  1. Placement strand evidence (`DECODING` at the placed phase)
  2. Top priority strand evidence (whichever strand is Priority 1)
  3. One "relative strength" strand if available (`priority == null`, `label == "Relative strength on this diagnostic"`). If no relative strength, omit this slot — do not pad with another weakness.
- `firstLessonRecommendation.evidence`: Pattern-specific evidence supporting the target choice — the per-pattern score for the recommended target. Example: `[{ strand: "DECODING", pattern: "a_e", score: 1, total: 4 }]`
- `listeningVsReading.evidence`: Both listening and reading scores.

```ts
[
  { strand: "LISTENING_COMPREHENSION", score: 5, total: 6 },
  { strand: "READING_COMPREHENSION", score: 2, total: 5 }
]
```

### 4.10 UI discipline for the student-facing diagnostic

- No phase labels visible to the student.
- No item-of-N counters.
- No phoneme notation (`/k/`) shown as text on student screens — phonemes are spoken via TTS.
- No correctness feedback.
- Calm, low-pressure language throughout.

---

## 5. The 8-Part Structured-Literacy Lesson Architecture

Every Reading Buddy lesson follows an evidence-informed sequence of eight pedagogical segments. The architecture is aligned with the OG-tradition lesson shape (cumulative review → explicit instruction → application → meaning) but uses our own packaging and naming.

### 5.1 The eight parts

| Part | Purpose | Default envelope |
|---|---|---|
| 1. Cumulative code review | Brief review of previously taught phoneme-grapheme correspondences, syllable patterns, spelling conventions, morphemes | 10-15 items, ~3-5 min |
| 2. Explicit target concept instruction | Direct modeling of the day's target pattern, rule, word part, syllable type, or language concept | 1 concept + 3-5 demonstration examples, ~5 min |
| 3. Word-level decoding | Reading controlled words organized as contrastive lines — target pattern in isolation, target vs. contrast, cumulative review, morphological variation | 15-20 real words + 8-10 pseudowords, ~7-10 min |
| 4. High-utility word and vocabulary work | Practice with heart words and selected vocabulary, distinguishing analyzable parts from less-regular parts | 3-5 new HFWs + 2-3 vocab items, ~5 min |
| 5. Sentence-level reading | Reading phrases or sentences applying decoding in syntax, phrasing, punctuation, meaning | 5-8 sentences (4-12 words each), ~5-7 min |
| 6. Encoding and spelling practice | Spelling sounds, word parts, words, phrases, sentences using the same code knowledge practiced in reading | 6 dictated words + 2 dictated sentences, ~7-10 min |
| 7. Controlled connected-text reading | Reading decodable text for accuracy, fluency, prosody, basic comprehension | 1 passage of 100-150 words at early phases, 200-300 at later phases, ~5-8 min |
| 8. Comprehension and language extension | Discussion, retell, vocabulary, background knowledge, sentence expansion, written response, listening comprehension | 3-5 questions + brief discussion, ~5 min |

**Total: ~45 minutes per complete lesson.** Item counts and time allocations are adaptive defaults, not fixed requirements. The autopilot tunes per student from session data.

### 5.2 The transfer chain (core acceptance criterion)

Every lesson must keep this chain intact:

> hear/say → map sounds to print → read words → read sentences → spell words → write sentences → read connected text → discuss meaning

A lesson that skips encoding, jumps to connected text without word-level work, or teaches a pattern in isolation without language application fails the pedagogy regardless of how it scores on any other metric. This is a hard constraint on lesson generation.

### 5.3 Daily target narrowness

Each lesson teaches **one specific pattern**. Examples of valid daily targets:

- "a_e words — silent-e helps the a say /ay/"
- "i_e words — silent-e helps the i say /eye/"
- "Closed syllables with -ck ending"
- "Suffix -ed on closed-syllable bases (one syllable)"
- "Prefix un- on known base words"

Examples of **invalid** daily targets (too broad):

- "Silent-e" (combines a_e, i_e, o_e, u_e, e_e — too many patterns at once)
- "Long vowels" (combines silent-e, open syllables, vowel teams)
- "Suffixes" (combines many distinct suffix patterns)

### 5.4 Contrastive word-list structure for Part 3

Word-level decoding is generated as 4-5 contrastive lines:

- **Line 1:** 4-5 words showing target pattern in isolation.
- **Line 2:** 4-5 words contrasting target with recently-taught patterns.
- **Line 3:** 4-5 words cumulative review across prior patterns plus a target sprinkle.
- **Line 4:** 4-5 pseudowords using the target pattern only (verifies decoding vs. memorization).
- **Optional Line 5:** Words with morphological variation (target + suffix where applicable).

### 5.5 Pseudoword generation constraints

Pseudowords must:

- Use **the target vowel pattern only** (an a_e lesson uses a_e pseudowords; not i_e, not o_e).
- **Not resemble common misspellings of real words.** Reject "drane" (sounds like drain), "brade" (braid), "kape" (cape). Prefer "mave," "lape," "zame," "vade."
- Be phonotactically plausible (follow English consonant-vowel constraints).

### 5.6 Warm-up discipline

Part 1 (cumulative code review) **never includes today's new pattern.** Warm-up is prerequisite review only. The new pattern is introduced fresh in Part 2.

### 5.7 Word category tagging

Every word that appears in a lesson is tagged into one of four categories:

| Tag | Meaning |
|---|---|
| `target` | Uses today's specific pattern |
| `prerequisite` | Decodable from previously-taught patterns |
| `heart` | High-frequency irregular word, must be previewed before use |
| `vocabulary` | Word being taught for meaning (may be decodable or not) |

The content generator must classify every word it produces. If a word doesn't fit any category for the current phase position, it cannot appear in the lesson.

### 5.8 Connected text decodability

The connected-text passage in Part 7 is **mechanically audited** at generation time. Every word maps to one of the four categories above. The system maintains a Story Content Audit visible in the tutor view:

- List of `target` words.
- List of `prerequisite` words.
- List of `heart` words (must be on the active student's previewed-HFW list from prior lessons or previewed in Part 4 of the current lesson).
- Zero unpreviewed, non-target words allowed.

If the generator produces a passage that contains any word not classifiable into these categories, the passage is rejected and regenerated. This is enforced as a hard gate, not a soft constraint.

**Machine-readable audit shape.** The auditor consumes the active `DailyTarget`'s `targetPatternsJson`, `allowedPatternCodes`, and `blockedPatternCodes` fields (not free-text `description`), plus the active student's previewed-HFW list and the cumulative prior-target pattern set. For every token in the passage it emits:

```ts
type WordAudit = {
  token: string;                  // Word as it appears in the passage
  normalized: string;             // Lowercased, punctuation-stripped
  category: "target" | "prerequisite" | "heart" | "vocabulary" | "unclassified";
  matchedPattern?: string;        // e.g., "a_e", "closed_short_a", "digraph_sh", "ndl_lemma:lake"
  reason: string;                 // Why this category was assigned (or why unclassified)
};

type PassageAudit = {
  passageId: string;
  dailyTargetCode: string;
  studentUserId?: string;         // Optional — student-specific audits use the previewed-HFW snapshot
  words: WordAudit[];
  targetCount: number;
  prerequisiteCount: number;
  heartCount: number;
  vocabularyCount: number;
  unclassifiedCount: number;
  blockedPatternViolations: string[];  // Tokens that matched a blockedPatternCode
  decodabilityScore: number;      // 0-1
  passesAuditGate: boolean;       // unclassifiedCount === 0 && blockedPatternViolations.length === 0
};
```

The `PassageAudit` object is stored as `Passage.contentAuditJson`. A passage with `passesAuditGate = false` is auto-rejected before reaching the human review queue. Human reviewers see the audit alongside the passage text; they cannot approve a passage that fails the gate.

### 5.9 Adaptive re-teach interrupts

Re-teach is **not a fixed lesson part**. It is an inline adaptive interrupt that fires when error patterns are detected during any other lesson part.

**Triggers:**

- 2+ consecutive misses on target-pattern items during Part 3 (decoding).
- A specific misconception detected during Part 6 (e.g., "cake" spelled as "cak" — silent-e omitted).
- A miscue on a target word during Part 7 (connected text).
- Autopilot uncertainty about whether the student has internalized the pattern.

**Behavior:**

- Lesson pauses at the trigger point.
- Re-teach screen shows: targeted reminder of the pattern + corrected modeling + "Try again."
- Each re-teach is logged as a `ModelDecision` row with the trigger type, the lesson part it interrupted, and the outcome.
- After re-teach, the student returns to the lesson part where the error occurred. The lesson does not restart.

### 5.10 Listen-first scaffold on connected text

Part 7 offers two paths:

- **"Listen first"** — TTS reads the passage to the student first, then the student reads. The kid's read is scored as **assisted**.
- **"Read on my own"** — student reads directly. Scored as **independent**.

These are tracked as separate fields in the lesson outcome. The dashboard explicitly labels which mode was used; assisted and independent reads are never aggregated into a single fluency claim.

### 5.11 UI discipline for the student-facing lesson

- Lesson part labels are kid-friendly ("Warm-up," "New thing to learn," "Reading words") rather than jargon.
- No curriculum metadata in kid view (next phases roadmap, internal sub-position codes, etc.). These appear only in the tutor/system view.
- Feedback during practice is **appropriate** during lessons (unlike during diagnostic) — corrective, encouraging, teaching.
- "Listen first" and "Read on my own" are kid-facing labels. The scoring distinction (assisted vs scored-independent) lives in the adult card, not the button label.
- Tap-to-start, tap-to-stop voice interaction (same as diagnostic).
- "Take your time" framing throughout; no timers visible to the student.

### 5.12 Kid-view copy rules

These rules apply to every string rendered inside the student-facing lesson surface. Codex must enforce them at the component layer; reviewers must reject any kid-view copy that violates them.

**No phoneme notation in kid view.** The student never sees IPA-style notation (`/ā/`, `/kăk/`, `/sh/`, slashes, macrons, breves, or any diacritic that marks a phoneme). Replace with kid-facing language:

- `/ā/` → "its name" or "ay"
- `/kăk/` (the kid's mis-reading) → "cack" (in quotes, plain spelling)
- `/sh/` → "sh sound" or just the letters `sh`
- `/ē/` → "its name" or "ee"

Phoneme notation is acceptable inside the **tutor/adult-side card** (where the audience can read it) and inside `LessonPart.contentJson` debug metadata, but never in `LessonPart.kidVisibleCopy`.

**No curriculum metadata in kid view.** Strings like "prerequisites only," "scored independent," "assisted," "All pseudowords use today's a_e pattern and avoid real-word misspellings," "Independent accuracy is scored only if the student chooses 'Read on my own,'" "This card is not a fixed lesson part. It appears immediately after a repeated pattern error," "Phase 3 · target: a_e words" — all of these are design notes describing **how** the lesson is built, not instructions to the kid. They belong in the tutor card, the spec, or `LessonPart.designNotes` — never in kid view.

**No phase / position / framework codes in kid view.** "Phase 3," "Position 3.M," "Track A," "PA_PSSA_ELA module," "PA-Core CC.1.3.K.D" — all internal. Kid sees "Today: a_e words" or "Today's lesson," nothing more.

**Lesson titles are pattern-specific.** "a_e words," not "silent-e" (which would overgeneralize to i_e, o_e, u_e). The pattern under instruction today is the title.

**Sub-button copy is plain-language.** Below "Listen first" → "Buddy reads it to you." Below "Read on my own" → "You read it out loud." Never "assisted" / "scored independent" as kid-visible chips.

**Re-teach copy mirrors the kid's actual error in plain spelling.** "You said 'cack.' Let's try again — the silent e helps the a say its name." Never phoneme notation. Never "you produced the short-vowel allophone."

**Lesson part labels are stable across lessons.** Part 1 is always "Warm-up." Part 2 is always "New thing to learn." Part 7 is always "Reading a story." The kid should not see "Warm-up · prerequisites only" in one lesson and "Warm-up" in another — internal qualifiers don't bleed into the label.

**Schema implication.** Each `LessonPart` row has two copy fields: `kidVisibleCopy` (passes a linter that rejects phoneme notation, jargon tokens, and metadata phrases) and `tutorVisibleCopy` (no such restriction). A reviewer linter runs at passage/lesson approval time and blocks publish on violations. See §7 for schema details.

### 5.13 Autopilot next-target selection logic

After each `LessonSession` completes, the autopilot decides the student's next daily target. In v1, this is a **deterministic rule-based engine** reading from `DailyTargetMastery`. After enough labeled tutor-override data accumulates (~500 sessions with logged overrides), a future spec replaces this engine with a trained policy model. The v1 rules below are the operational logic Codex implements.

**Inputs.**

- The student's `DailyTargetMastery` row for the current target.
- The student's `DailyTargetMastery` history (recent targets at this phase position).
- `ReteachEvent` rows from the just-completed `LessonSession`.
- Strand priority from the diagnostic (`LiteracyProfile.diagnosticEvidenceJson`).
- The scope-and-sequence order via `DailyTarget.introductionOrder` within the active `PhasePosition`.

**Decision rules (evaluated in precedence order).**

1. **Session-incomplete guard.** If `LessonSession.completedAt IS NULL` (student bailed mid-lesson), do not update `DailyTargetMastery`. Re-queue the same target for the next session with no variant change. Autopilot output: `RETRY_SAME_TARGET`.

2. **Mastery-secure → advance.** If `decodingStatus = SECURE` AND `encodingStatus = SECURE` AND `connectedTextStatus = SECURE` AND fewer than 2 major re-teach events fired in the session, advance to the next daily target by `introductionOrder` within the current phase position. Output: `ADVANCE_TO_NEXT_TARGET`.

3. **Decoding strong, encoding lagging → repeat with encoding emphasis.** If `decodingStatus = SECURE` AND `encodingStatus != SECURE`, repeat the same target. Select the encoding-emphasis lesson variant (more dictation, more sentence spelling, less new word-reading). Output: `REPEAT_TARGET_ENCODING_EMPHASIS`.

4. **Decoding + encoding strong, connected text weak → repeat with controlled-text emphasis.** If `decodingStatus = SECURE` AND `encodingStatus = SECURE` AND `connectedTextStatus != SECURE`, repeat the same target. Select the controlled-text-emphasis variant (longer passage, more Part 7 practice). Output: `REPEAT_TARGET_CONNECTED_TEXT_EMPHASIS`.

5. **Decoding weak → repeat with explicit re-teach.** If `decodingStatus = NOT_STARTED` OR `DEVELOPING`, OR 2+ major re-teach events fired this session, repeat the same target with the explicit-re-teach lesson variant (more Part 2 concept time, smaller Part 3 word set, more scaffolded Part 6 dictation). Output: `REPEAT_TARGET_EXPLICIT_RETEACH`.

6. **Loop-detection escalation.** If the student has repeated the same target 3+ consecutive times without reaching `decodingStatus = SECURE`, surface a flag in the tutor dashboard: *"Student has spent N sessions on [target] without reaching secure decoding. Consider a tutor-led review of approach."* Autopilot pauses on this target — does not advance and does not silently loop indefinitely. Output: `ESCALATE_TO_TUTOR_NO_AUTO_ADVANCE`.

7. **Diagnostic-misplacement escalation.** If the student has scored ≥95% on 3+ consecutive lessons at the current phase position with no re-teach events, surface a flag: *"Student may be misplaced. Recommend a brief re-diagnostic at the next higher phase position."* Autopilot continues normal selection until the tutor responds. Output: `FLAG_POSSIBLE_MISPLACEMENT` (does not block continued lessons).

**Strand-priority modifiers (additive to the target selection above).**

- If the diagnostic indicated **PA as Priority 1**: every lesson at this phase position adds an extended oral PA warm-up to Part 1 (selected from the approved PA item pool).
- If the diagnostic indicated **listening comprehension stronger than reading comprehension**: every lesson at this phase position emphasizes decoding/fluency practice (additional Part 7 controlled-text passes) while preserving the full Part 8 discussion.
- If the diagnostic indicated **morphology as a relative strength**: Phase 3+ lessons may surface morphology-based hints in re-teach copy (e.g., "this word has the -s ending you know"); does not change the daily target selection.

**Output.**

The autopilot writes a recommendation that surfaces in three places: the tutor dashboard ("Autopilot recommendation" card with the human-readable rationale), the parent update copy, and the next-session lesson selector (`LessonSession.lessonId` for the upcoming session). The decision is logged as a `ModelDecision` row with `decisionType = "AUTOPILOT_NEXT_TARGET"`, carrying the inputs, the rule that fired, and the recommended output.

**Tutor override.**

Tutors can override the autopilot recommendation from the dashboard. Overrides write a `ModelDecisionOutcome` row tied to the autopilot decision, capturing the override target and the tutor's reasoning if provided. These overrides are the primary labeled training data for replacing the rule-based engine with a trained policy in a future spec.

---

## 6. Content Sourcing Model

### 6.1 Hybrid: open-passage filtering first, AI generation as fallback

For connected-text passages (Part 7), the system prefers open-licensed real passages over AI-generated text where possible. Real human-authored text has richer language, narrative structure, and vocabulary variety.

**Selection pipeline:**

1. **Candidate retrieval.** Pull candidate passages from StoryWeaver (CC BY 4.0), Global Digital Library (CC BY / CC BY-SA), and Project Gutenberg (public domain).
2. **Decodability scoring.** Given a candidate passage and the active phase position, compute a decodability score: percentage of words classifiable as `target`, `prerequisite`, or already-previewed `heart` words. Words not classifiable count against the score.
3. **Threshold filter.** Passages above the threshold for the active phase enter the production pool. Threshold defaults: 98% at Phases 0-2, 95% at Phases 3-5, 92% at Phase 6 (where some Latinate vocabulary may not strictly decode but the student's morphology track supports recognition).
4. **AI fallback.** If no open passage meets the threshold for a given phase + target combination, AI generates a passage with strict mechanical validation against the same audit rules.

### 6.2 Pre-generation + human review pipeline

All passages are **pre-generated in advance, not at lesson runtime.**

- A scheduled job generates candidate passages for the active scope-and-sequence positions.
- Each candidate enters a `PassageReviewQueue`.
- An admin UI presents the queue to a human reviewer (initially the founder; eventually trained content reviewers) for approve / reject / edit.
- Approved passages enter the `Passage` production pool.
- Lesson flow selects from approved passages only.
- Reviewer decisions are logged as `ModelDecisionOutcome` rows for future training data.

This pattern ensures:

- Students never see an unreviewed passage.
- Bulk generation can use slower, more expensive models (GPT-4o, Claude Opus) since latency doesn't matter.
- Human review catches what AI generation misses: tone, age-appropriateness, cultural sensitivity, factual errors.
- Approved passages compound into a curated library over time.

### 6.3 LLM provider strategy

Primary content generation uses **OpenAI GPT-4o** (already wired and instrumented via `recordModelDecision`). Claude Sonnet is available for A/B comparison via the model comparison admin panel. The data flywheel logs every generation as a `ModelDecision` with the reviewer's approve/reject decision as the outcome.

This corpus becomes the training data for the eventual LLM-independence roadmap (see `specs/data-flywheel-foundation-codex-spec.md` §16). After ~2,000 reviewer-approved passages, fine-tuning a Llama 3 8B or Mistral 7B for passage generation becomes viable. Reading Buddy's path to a proprietary content model runs through this generation + review pipeline.

### 6.4 High-frequency word source

Reading Buddy uses **the New Dolch List (NDL) 1.1, lemmatized-for-teaching version**, as the canonical HFW source. License: CC BY-SA 4.0 from the New General Service List Project. Commercial use is permitted under CC BY-SA 4.0, but the license imposes two operational obligations: (1) attribution to the New General Service List Project must be preserved in product credits and on the About page, and (2) any adapted list content (e.g., subset selections, frequency-reranked exports) carries the same CC BY-SA 4.0 share-alike obligation — meaning derivatives must remain under the same license. Internal product use of the list is unaffected; redistribution of an adapted list is what triggers share-alike.

- NDL 1.1 alphabetized version retained as plain-text human-readable backup.
- NDL 1.1 with frequency statistics provides ranking for sequencing.
- Attribution to the New General Service List Project surfaces in the product credits / About page.
- The HFW dataset lives in `data/hfw/ndl_lemmatized.json` (ingested by the v2 content pipeline).

### 6.5 Word frequency overlay

The existing SUBTLEX data in `data/phonogram/subtlex.*` provides frequency validation. When the lesson generator considers a word for inclusion, SUBTLEX confirms whether it appears with sufficient frequency in real text to be worth teaching at this phase. BNC frequency lists (CC BY-SA 2.0 UK) provide a secondary sanity check.

### 6.6 Phoneme and pronunciation data

CMUdict (already in `data/phonogram/cmudict.*`) provides phoneme-level data for pronunciation, rhyme detection, pseudoword generation, and decoding-item validation. Used by the pseudoword generator to ensure phonotactic plausibility.

### 6.7 Morphology dataset

**MorphoLex-en is licensed CC BY-NC-SA 4.0 (NonCommercial-ShareAlike).** Reading Buddy is a commercial product. Ingesting MorphoLex-en into the production content engine without explicit commercial permission from the maintainer would violate the NonCommercial term. Until permission is obtained, **MorphoLex-en is design reference only** — usable to inform our own affix/root catalog, but not shipped as product data.

For production, Reading Buddy builds its own `Morpheme` catalog (prefix / suffix / root, frequency, decomposition, productivity, allomorphs) from commercially-usable sources: Wiktionary morphology data (CC BY-SA 3.0 — share-alike obligations apply if redistributed), CMUdict-derived phonology, public-domain etymological dictionaries, and original linguistic curation. The Track B morphology lesson generator for Phases 3-6 reads from this proprietary catalog.

Two follow-ups are required before Phase 3+ morphology lessons can ship:

1. Either secure commercial permission from the MorphoLex-en maintainer (Hugo Mailhot), or build the proprietary morpheme catalog described above. Recommendation: build the proprietary catalog — it removes the licensing dependency entirely and becomes a long-term product asset.
2. Document the morpheme catalog's own sources and attributions in the `LicenseAttribution` table (§7).

### 6.8 AI first-look review tier

The review pipeline is **three-stage**, not two-stage:

1. **Mechanical audit gate.** Pure code. Runs `passesAuditGate` per §5.8. Rejects on `unclassifiedCount > 0`, `blockedPatternViolations.length > 0`, or decodability below the phase threshold. No AI involved.
2. **AI first-look review.** Runs on candidates that passed the mechanical gate. An LLM reviewer (initially GPT-4o, swappable per `lib/decisions/decisionTypes.ts`) consumes the candidate plus an artifact-type-specific checklist and emits a structured judgment. This is itself a `ModelDecision` row with `decisionType = "CONTENT_FIRST_LOOK_REVIEW"`.
3. **Human review.** The human reviewer (founder, then content lead, then reading specialist) sees the AI first-look output alongside the candidate. The AI's recommendation is a hint, never a binding decision — humans can override.

The AI first-look filters the queue so humans see only what needs their judgment. It does not replace human review; it makes human review tractable at the inventory volume the product requires.

**AI reviewer output shape.**

```ts
type AIFirstLookReview = {
  modelDecisionId: string;
  artifactType: "DIAGNOSTIC_ITEM" | "LESSON_PART" | "PASSAGE";
  artifactId: string;
  recommendation: "APPROVE" | "FLAG_FOR_HUMAN" | "REJECT";
  confidence: number;          // 0-1
  checksPassed: string[];      // Checklist items that passed
  checksFailed: string[];      // Checklist items that failed (with brief reason)
  specificIssues: Array<{
    severity: "minor" | "moderate" | "major";
    location: string;          // e.g., "Part 2 concept text", "Line 4 pseudoword #3", "passage paragraph 2"
    description: string;
    suggestedFix?: string;
  }>;
  kidViewLintViolations: string[];  // §5.12 violations specifically
};
```

This row is stored as `ModelDecision.decisionJson` and referenced by `Passage.firstLookReviewModelDecisionId` / `LessonPart.firstLookReviewModelDecisionId` / `DiagnosticItem.firstLookReviewModelDecisionId`.

**Per-artifact-type checklists.**

The reviewer runs a different checklist per artifact type. The checklists are themselves versioned prompts stored in `lib/content/firstLookChecklists/` so they can be tuned without code changes.

- **Diagnostic item.** Item type matches the strand's expected types. Difficulty band aligns with the target phase. Prompt is unambiguous for the target grade. Correct answer is unique and defensible. Distractors (if any) are plausible distractors of the same error type. Voice prompts contain no phoneme notation in the kid-spoken script. Pseudowords pass the real-word-misspelling check.
- **Lesson part.** §5.12 kid-view copy rules enforced (no phoneme notation, no metadata, no curriculum jargon). Part-specific structural rules — Part 1 contains zero instances of today's daily target pattern; Part 3 word lines follow contrastive structure (closed → contrast → contrast → pseudoword); Part 4 heart-word previews match exactly the heart words used in the Part 7 passage; Part 6 dictation includes both target and prerequisite review; Part 8 questions are open-ended, not yes/no.
- **Passage.** Narrative coherence and age-appropriateness. Cultural sensitivity (no stereotypes, no inadvertent othering). Factual accuracy for nonfiction. Tone matches the target grade. The mechanical `WordAudit` is sanity-checked — does each word's assigned category actually make sense? Engagement potential: would a real second-grader want to read this?

**Auto-approve threshold.**

In v1, the AI reviewer's `APPROVE` recommendation does **not** auto-approve content. Every candidate still requires a human click. The AI recommendation is displayed prominently to speed human review, but humans remain in the loop for every artifact reaching production.

Once enough outcome data exists (~500-1000 reviewed artifacts with logged human override patterns), an auto-approve threshold can be enabled per artifact type, controlled by a feature flag and a per-type confidence threshold. Auto-approval is reversible — humans can still spot-audit and retract approval, which retires the artifact via the versioning fields.

**Where this feeds the flywheel.**

Every `AIFirstLookReview` row pairs with a `ModelDecisionOutcome` row reflecting the human's final decision (approve / reject / edit). This gives a labeled corpus of "AI thought X, human decided Y" — exactly the training data needed to fine-tune a downstream first-look reviewer model. The same way the passage generator becomes a candidate for Llama fine-tuning after ~2,000 approved passages (see `specs/data-flywheel-foundation-codex-spec.md` §16), the AI reviewer becomes a fine-tuning candidate after ~500 human override pairs.

---

## 7. Database Schema Changes

All additions to `prisma/schema.prisma`. Extends models introduced in v1, voice-flywheel, and data-flywheel specs.

### 7.1 New models

```prisma
model PhasePosition {
  id              String   @id @default(cuid())
  phaseNumber     Int      // 0-6
  subPosition     String   // "ENTRY" | "MID"
  label           String   // Human-readable, e.g. "Phase 3 Mid"
  phonicsTrack    String   @db.Text // Description of Track A focus
  morphologyTrack String   @db.Text // Description of Track B focus
  prerequisites   String[] // List of phase positions that must be mastered first
  createdAt       DateTime @default(now())

  lessons         Lesson[]
  diagnosticItems DiagnosticItem[]

  @@unique([phaseNumber, subPosition])
}

model DailyTarget {
  id              String   @id @default(cuid())
  phasePositionId String
  code            String   @unique  // e.g. "a_e", "i_e", "closed_ck", "suffix_ed_one_syllable"
  kidVisibleLabel String   // Kid-friendly, e.g. "a_e words" (no phoneme notation — see §5.12)
  tutorLabel      String   // e.g. "a_e silent-e — vowel says its name"
  description     String   @db.Text
  introductionOrder Int    // Sequence within the phase position

  // Machine-readable audit metadata. Used by the lesson content auditor to enforce the narrow-target rule
  // mechanically — not by reading description text.
  targetPatternsJson  Json      // e.g. {"patterns": ["a_e"], "phoneme": "long_a", "graphemes": ["a_e"]}
  allowedPatternCodes String[]  // Previously taught patterns that may appear in this lesson's review words
  blockedPatternCodes String[]  // Patterns that must NOT appear (e.g., for an a_e lesson: ["i_e", "o_e", "u_e", "e_e", "ai", "ay"])
  exampleWords        String[]  // Canonical real-word examples of this target
  exampleNonwords     String[]  // Canonical pseudoword examples (avoid real-word misspellings)

  // Versioning
  version           Int      @default(1)
  effectiveFrom     DateTime @default(now())
  retiredAt         DateTime?

  createdAt       DateTime @default(now())

  phasePosition   PhasePosition @relation(fields: [phasePositionId], references: [id])
  lessons         Lesson[]
  diagnosticItems DiagnosticItem[]
  mastery         DailyTargetMastery[]
}

model DiagnosticItem {
  id              String   @id @default(cuid())
  strand          String   // "PA" | "DECODING" | "MORPHOLOGY" | "FLUENCY" | "VOCABULARY" | "COMPREHENSION"
  phasePositionId String?
  dailyTargetId   String?
  itemType        String   // "PHONEME_MANIPULATION" | "REAL_WORD_DECODE" | "PSEUDOWORD_DECODE" | "BASE_WORD_ID" | etc.
  promptJson      Json     // Item content (audio prompt, text, etc.)
  correctAnswer   String?
  scoringRubricJson Json?
  difficultyBand  Int      // 1-7 corresponding to phase numbers
  isPracticeItem  Boolean  @default(false)

  // Review pipeline — no unreviewed items reach a student.
  reviewStatus      String   @default("PENDING")  // "PENDING" | "APPROVED" | "REJECTED" | "EDITED"
  reviewedAt        DateTime?
  reviewedByUserId  String?
  reviewNotes       String?  @db.Text
  firstLookReviewModelDecisionId String?  // FK to the ModelDecision row carrying the AIFirstLookReview output (§6.8)

  // Versioning — items can be revised over time without breaking historical attempts.
  version           Int      @default(1)
  effectiveFrom     DateTime @default(now())
  retiredAt         DateTime?

  createdAt       DateTime @default(now())

  phasePosition   PhasePosition? @relation(fields: [phasePositionId], references: [id])
  dailyTarget     DailyTarget?   @relation(fields: [dailyTargetId], references: [id])
  attempts        DiagnosticItemAttempt[]

  @@index([strand, difficultyBand])
  @@index([reviewStatus])
}

model DiagnosticItemAttempt {
  id                 String   @id @default(cuid())
  studentUserId      String
  diagnosticItemId   String
  diagnosticSessionId String
  responseJson       Json?    // Voice transcript, selected option, etc.
  scored             Boolean
  correct            Boolean?
  responseTimeMs     Int?
  audioConfidence    Float?
  scoreContext       String?  // "PRACTICE" | "ROUTING" | "PLACEMENT"
  attemptedAt        DateTime @default(now())

  diagnosticItem     DiagnosticItem @relation(fields: [diagnosticItemId], references: [id])

  @@index([studentUserId, diagnosticSessionId])
  @@index([diagnosticItemId])
}

model DiagnosticSession {
  id              String   @id @default(cuid())
  studentUserId   String
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  resultJson      Json?    // Phase placement, strand scores, why-here breakdown
  confidenceScore Float?
  confidenceExplanation String? @db.Text
  totalScoredItems Int    @default(0)
  audioClearItems Int     @default(0)

  @@index([studentUserId, startedAt])
}

model Lesson {
  id              String   @id @default(cuid())
  phasePositionId String
  dailyTargetId   String
  parts           LessonPart[]
  passage         Passage? @relation(fields: [passageId], references: [id])
  passageId       String?

  // Versioning. A Lesson is "ready to serve" only when every LessonPart it owns has reviewStatus = APPROVED
  // and the linked Passage (if any) is APPROVED. This is computed at query time, not stored.
  version           Int      @default(1)
  effectiveFrom     DateTime @default(now())
  retiredAt         DateTime?

  createdAt       DateTime @default(now())

  phasePosition   PhasePosition @relation(fields: [phasePositionId], references: [id])
  dailyTarget     DailyTarget   @relation(fields: [dailyTargetId], references: [id])
  sessions        LessonSession[]

  @@index([phasePositionId, dailyTargetId])
}

model LessonPart {
  id              String   @id @default(cuid())
  lessonId        String
  partNumber      Int      // 1-8
  partLabel       String   // Kid-friendly label
  kidVisibleCopy  Json     // Strings rendered in the student-facing surface; linted at publish (no phoneme notation, no curriculum metadata — see §5.12)
  tutorVisibleCopy Json?   // Strings rendered in the adult/tutor card; no kid-view linter
  contentJson     Json     // Items, word lists, sentences, dictation list, etc. (machine-readable)
  designNotes     String?  @db.Text  // Reviewer/spec notes that must never reach kid view

  // Review pipeline — a Lesson is only ready to serve when every LessonPart is APPROVED.
  reviewStatus      String   @default("PENDING")  // "PENDING" | "APPROVED" | "REJECTED" | "EDITED"
  reviewedAt        DateTime?
  reviewedByUserId  String?
  reviewNotes       String?  @db.Text
  firstLookReviewModelDecisionId String?  // FK to the ModelDecision row carrying the AIFirstLookReview output (§6.8)

  // Versioning — parts can be revised; old versions retire instead of deleting.
  version           Int      @default(1)
  effectiveFrom     DateTime @default(now())
  retiredAt         DateTime?

  lesson          Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([lessonId, partNumber])
  @@index([reviewStatus])
}

model Passage {
  id              String   @id @default(cuid())
  source          String   // "STORYWEAVER" | "GDL" | "GUTENBERG" | "AI_GENERATED"
  sourceMetadataJson Json? // Original author, URL, license, etc.
  wordCount       Int
  phasePositionId String
  text            String   @db.Text
  contentAuditJson Json    // {target: [...], prerequisite: [...], heart: [...], unclassified: []}
  decodabilityScore Float  // 0-1
  reviewStatus    String   @default("PENDING")  // "PENDING" | "APPROVED" | "REJECTED" | "EDITED"
  reviewedAt      DateTime?
  reviewedByUserId String?
  reviewNotes     String?  @db.Text
  firstLookReviewModelDecisionId String?  // FK to the ModelDecision row carrying the AIFirstLookReview output (§6.8)

  // Versioning + license attribution
  version              Int      @default(1)
  effectiveFrom        DateTime @default(now())
  retiredAt            DateTime?
  sourceAttributionCode String?  // FK-by-code to LicenseAttribution.sourceCode (e.g., "STORYWEAVER", "GDL", "GUTENBERG", "AI_GENERATED")

  createdAt       DateTime @default(now())

  lessons         Lesson[]
  passageReviewLog PassageReviewLog[]

  @@index([phasePositionId, reviewStatus])
}

model PassageReviewLog {
  id              String   @id @default(cuid())
  passageId       String
  action          String   // "APPROVED" | "REJECTED" | "EDITED" | "FLAGGED"
  reviewerUserId  String
  notes           String?  @db.Text
  editDiffJson    Json?    // If edited, before/after diff
  createdAt       DateTime @default(now())

  passage         Passage  @relation(fields: [passageId], references: [id], onDelete: Cascade)
}

model HighFrequencyWord {
  id              String   @id @default(cuid())
  lemma           String   @unique
  forms           String[] // Inflected forms from NDL lemmatized list
  isRegular       Boolean  // Decodable by standard rules
  ndlRank         Int?     // Position in NDL 1.1 frequency ranking
  subtlexRank     Int?     // Position in SUBTLEX ranking
  introducedAtPhase Int    // Earliest phase position where this word is introduced
  createdAt       DateTime @default(now())

  studentMastery  HfwMastery[]
}

model HfwMastery {
  id              String   @id @default(cuid())
  studentUserId   String
  hfwId           String
  level           String   // "INTRODUCED" | "DEVELOPING" | "MASTERED"
  reviewCount     Int      @default(0)
  lastSeenAt      DateTime?

  hfw             HighFrequencyWord @relation(fields: [hfwId], references: [id])

  @@unique([studentUserId, hfwId])
}

model DailyTargetMastery {
  id                   String   @id @default(cuid())
  studentUserId        String
  dailyTargetId        String

  // Three independent mastery dimensions per target. Autopilot needs all three, not a single mastery boolean.
  decodingStatus       String   @default("NOT_STARTED")  // "NOT_STARTED" | "DEVELOPING" | "SECURE"
  encodingStatus       String   @default("NOT_STARTED")
  connectedTextStatus  String   @default("NOT_STARTED")

  lastDecodingAccuracy Float?
  lastEncodingAccuracy Float?
  lastConnectedTextAccuracy Float?
  evidenceJson         Json?    // Structured rolling-window breakdown of recent attempts
  lastPracticedAt      DateTime?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  dailyTarget          DailyTarget @relation(fields: [dailyTargetId], references: [id])

  @@unique([studentUserId, dailyTargetId])
  @@index([studentUserId])
}

model LicenseAttribution {
  id              String   @id @default(cuid())
  sourceCode      String   @unique  // "NDL" | "STORYWEAVER" | "GDL" | "GUTENBERG" | "UK_PSC" | "CMUDICT" | "BNC" | "WIKTIONARY" | "MORPHOLEX_EN" | "AI_GENERATED" | "ORIGINAL"
  sourceName      String   // Human-readable
  licenseCode     String   // "CC_BY_4_0" | "CC_BY_SA_4_0" | "CC_BY_NC_SA_4_0" | "CC_BY_NC_SA_3_0" | "CC_BY_SA_3_0" | "PD" | "OGL" | "COMMERCIAL" | "ORIGINAL"
  attributionText String   @db.Text  // Exact required attribution string for product credits
  sourceUrl       String?
  commercialUseAllowed Boolean
  shareAlikeRequired   Boolean
  notes           String?  @db.Text
  createdAt       DateTime @default(now())
}

model LessonSession {
  id              String   @id @default(cuid())
  studentUserId   String
  lessonId        String
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  partResultsJson Json     // Per-part scores
  reteachLogJson  Json     // Re-teach interrupts that fired
  connectedTextMode String?  // "INDEPENDENT" | "ASSISTED" | null
  masteryConfidence Float?
  durationSeconds Int?

  lesson          Lesson   @relation(fields: [lessonId], references: [id])

  @@index([studentUserId, startedAt])
}

model ReteachEvent {
  id              String   @id @default(cuid())
  lessonSessionId String
  triggeredAtPart Int      // 3, 6, 7 etc.
  triggerType     String   // "DECODING_PATTERN" | "SPELLING_OMISSION" | "STORY_MISCUE" | "AUTOPILOT_UNCERTAIN"
  targetConcept   String   // What was being re-taught
  outcomeJson     Json?    // Did the kid succeed on the retry?
  occurredAt      DateTime @default(now())

  @@index([lessonSessionId])
}
```

### 7.2 Field additions

Existing models from prior specs get extensions:

```prisma
// Add to LiteracyProfile
currentDailyTargetId String?
phasePositionId      String?
diagnosticConfidence Float?
diagnosticEvidenceJson Json?  // The "why this placement" structured data

// Add to StrandScore
evidenceCount        Int      @default(0)
priorityRank         Int?     // 1 = highest priority for instruction
statusLabel          String?  // "Priority 1" | "Priority 2" | ... | "Relative strength on this diagnostic"
```

---

## 8. New Routes

All under `app/`. Use existing auth/rateLimit patterns.

### Student-facing

| Route | Component | Purpose |
|---|---|---|
| `app/student/diagnostic/intro/page.tsx` | `DiagnosticIntroFlow` | Welcome, mic check, practice item |
| `app/student/diagnostic/[strand]/page.tsx` | `DiagnosticStrandFlow` | Run a single strand (PA, decoding, morphology, fluency, vocab, comprehension) |
| `app/student/lesson/[lessonSessionId]/page.tsx` | `LessonSessionShell` | Container for the 8-part lesson |
| `app/student/lesson/[lessonSessionId]/part/[partNumber]/page.tsx` | `LessonPartFlow` | One lesson part |

### Adult-facing

| Route | Component | Purpose |
|---|---|---|
| `app/teacher/literacy/[studentId]/diagnostic/page.tsx` | `DiagnosticResultsView` | Evidence-backed phase placement + strand priority + why-this-placement breakdown |
| `app/teacher/literacy/[studentId]/lesson-history/page.tsx` | `LessonHistoryView` | Past lessons with autopilot recommendations |
| `app/parent/literacy/[studentId]/update/page.tsx` | `ParentUpdateView` | Pre-written, parent-friendly progress summary |
| `app/admin/content/passages/queue/page.tsx` | `PassageReviewQueue` | Pre-generated passages awaiting human review |
| `app/admin/content/passages/[passageId]/page.tsx` | `PassageReviewWorkspace` | Single-passage review with content audit visible |

---

## 9. API Endpoints

All under `app/api/`. Follow existing auth/rateLimit patterns.

### Diagnostic

| Method + Path | Purpose | Auth |
|---|---|---|
| `POST /api/literacy/diagnostic/start` | Begin a new diagnostic session | Student or Admin |
| `POST /api/literacy/diagnostic/:sessionId/item-attempt` | Submit an item attempt | Student |
| `GET /api/literacy/diagnostic/:sessionId/next-item` | Get the next adaptively-selected item | Student |
| `POST /api/literacy/diagnostic/:sessionId/complete` | Finalize diagnostic, compute placement + strand priorities | System |

### Lesson

| Method + Path | Purpose | Auth |
|---|---|---|
| `POST /api/literacy/lesson/start` | Start a new lesson session | Student or Admin |
| `POST /api/literacy/lesson/:sessionId/part/:partNumber/submit` | Submit results for a lesson part | Student |
| `POST /api/literacy/lesson/:sessionId/reteach-trigger` | Log a re-teach interrupt | System |
| `POST /api/literacy/lesson/:sessionId/complete` | Finalize lesson, compute mastery confidence, surface autopilot recommendation | System |

### Content management

| Method + Path | Purpose | Auth |
|---|---|---|
| `POST /api/admin/content/passages/generate` | Trigger bulk passage generation for a phase position | Admin |
| `GET /api/admin/content/passages/queue` | List passages awaiting review | Admin |
| `POST /api/admin/content/passages/:id/review` | Approve / reject / edit a passage | Admin |
| `POST /api/admin/content/words/audit` | Audit a candidate word list against active phase position's allowed categories | Admin |

### Internal jobs

- `scripts/content/generate-passages.ts` — nightly batch generation of candidate passages for unfilled phase positions.
- `scripts/content/ingest-ndl.ts` — one-time ingest of NDL 1.1 lemmatized data into `HighFrequencyWord` table.
- `scripts/content/ingest-storyweaver.ts` — periodic ingest of new StoryWeaver passages as candidates.

---

## 10. Acceptance Criteria

### Diagnostic

- Every diagnostic session begins with mic check + practice item before any scored items.
- Decoding items show one word per card with no surrounding context.
- No correctness feedback appears during scored items.
- Decoding sub-test records response latency. Responses after 5 seconds are flagged `delayed` (not wrong); non-responses after 10 seconds are scored as no-attempt. Decoding placement uses accuracy; latency feeds the fluency strand and the tutor view.
- Within-strand adaptive ceiling: 4 consecutive misses stops upward probing in that strand.
- All 6 strands run for every student. No strand-skipping.
- Final placement requires ≥5 scored items per phase being considered.
- Real-word and pseudo-word evidence both present for decoding placement.
- Phase placement is decoding-determined. Strand priority is separate.
- Results dashboard includes: phase placement, "why this placement" breakdown (Secure / Developing / Not Yet Secure), strand priority ranking, listening-vs-reading comprehension comparison, confidence with explanation.
- Adult-facing language uses "Priority 1/2/3" and "Relative strength on this diagnostic," never "above/below grade level."

### Lessons

- Every lesson has 8 parts in the prescribed order.
- Daily target is narrow (one specific pattern, not a category).
- Warm-up (Part 1) never includes today's new pattern.
- Word-level decoding (Part 3) uses contrastive line structure.
- Pseudowords use only the target vowel pattern and don't resemble common misspellings of real words.
- Every word in the lesson is tagged into one of four categories: target / prerequisite / heart / vocabulary.
- Connected text (Part 7) passes mechanical decodability audit: every word classifiable; zero unpreviewed non-target words.
- Encoding (Part 6) includes minimum 6 dictation words + 2 dictation sentences.
- Listen-first vs. read-on-own paths score reads as assisted vs. independent in the dashboard.
- Re-teach is inline-triggered (not a fixed lesson step) and logged as a `ReteachEvent` row.
- Lesson-complete summary shows specific evidence ("18 of 20 a_e words").
- Tutor dashboard shows: per-part scores, story content audit, autopilot recommendation naming the specific next target, parent-update copy.
- Autopilot follows the §5.13 decision rules deterministically. The fired rule is logged in `ModelDecision.decisionJson`. Tutor overrides are captured as `ModelDecisionOutcome` rows.
- Autopilot never silently loops on the same target indefinitely. After 3 consecutive repeats without `decodingStatus = SECURE`, autopilot pauses and surfaces a tutor escalation flag.

### Content

- Every passage in `Passage` with `reviewStatus = APPROVED` has a `contentAuditJson` populated as the `PassageAudit` shape described in §5.8.
- **No `Passage`, `DiagnosticItem`, or `LessonPart` row with `reviewStatus != APPROVED` is ever served to a student.** The diagnostic engine, lesson engine, and passage selector all enforce this at the query layer (e.g., `where: { reviewStatus: "APPROVED", retiredAt: null }`).
- A `Lesson` is "ready to serve" only when every one of its `LessonPart` rows has `reviewStatus = APPROVED`.
- Passages with `passesAuditGate = false` cannot be approved by human reviewers — the approve button is disabled until the audit gate passes (the reviewer's options are reject or edit).
- Every generation call (passages, diagnostic items, lesson part content) is logged as a `ModelDecision` row.
- Every reviewer approve/reject decision is logged as a `ModelDecisionOutcome` row tied to the originating `ModelDecision`.
- The `HighFrequencyWord` table is populated from NDL 1.1 with attribution metadata via `LicenseAttribution.sourceCode = "NDL"`.
- The `LicenseAttribution` table is populated for every external data source the product ships, and the About page renders all rows where `commercialUseAllowed = true` and the source is in use.

---

## 11. What Codex Should NOT Do

1. **Do not ingest content from any commercial structured-literacy program.** No Wilson word lists, no CKLA lessons, no UFLI items, no Curriculum Associates passages, no OG Online Academy morphology tables, no Blevins word lists. Methodology only.
2. **Do not generate lesson content at student request-time in v1.** All passages and word lists go through pre-generation + review. Student lesson flow selects from approved content only.
3. **Do not serve unreviewed passages.** The `reviewStatus = APPROVED` check is mandatory.
4. **Do not allow "silent-e" or any broad-category target.** Daily target must be one specific pattern.
5. **Do not include today's new pattern in the warm-up.**
6. **Do not generate pseudowords that resemble common misspellings of real words.**
7. **Do not aggregate assisted and independent reads into a single fluency claim.**
8. **Do not skip strands in the diagnostic.** All 6 run for every student.
9. **Do not show phase labels, item counters, phoneme notation, or correctness feedback on student-facing diagnostic screens.**
10. **Do not claim "above grade level" or "below grade level"** without validated norm-referenced data behind the claim. Use "Priority 1/2/3" + "Relative strength on this diagnostic."
11. **Do not store raw filled prompts in `ModelDecision.inputContextJson`.** Use `promptKey` + structured parameters.
12. **Do not let AI silently replace deterministic scoring.** Per AGENTS.md — answer keys and scoring logic stay reliable.
13. **Do not let the autopilot loop on the same target indefinitely** or auto-advance without checking all three mastery dimensions (decoding, encoding, connected text). Follow §5.13's precedence-ordered rules and the loop-detection escalation.
14. **Do not have the autopilot use an LLM judgment call in v1.** v1 is deterministic rules over `DailyTargetMastery`. Replacing with a trained policy is a future spec.

---

## 12. Suggested Implementation Order

Build in this order; ship after each major step.

1. **Schema migration** — `PhasePosition`, `DailyTarget`, `DiagnosticItem`, `DiagnosticItemAttempt`, `DiagnosticSession`, `Lesson`, `LessonPart`, `Passage`, `PassageReviewLog`, `HighFrequencyWord`, `HfwMastery`, `LessonSession`, `ReteachEvent`. Field additions to `LiteracyProfile` and `StrandScore`.
2. **NDL ingestion** — `scripts/content/ingest-ndl.ts` populates `HighFrequencyWord` from NDL 1.1 lemmatized.
3. **Phase position + daily target seed** — populate the 7 phase positions (Entry/Mid for each = 14 positions) and the daily targets within each phase (e.g., a_e, i_e, o_e, u_e, e_e for Phase 3 Entry).
4. **Diagnostic item generation** — produce the initial pool of diagnostic items across all 6 strands and difficulty bands. Per-strand item generators that emit candidates for review.
5. **AI first-look reviewer (§6.8)** — per-artifact-type checklist prompts in `lib/content/firstLookChecklists/`, the runner that invokes the checklist as a `ModelDecision`, and the storage of `AIFirstLookReview` output on the candidate row. Built before the human review queues so every candidate ships to humans with an AI pre-read attached.
6. **Diagnostic item review tooling** — admin UI to approve initial item pool before any student sees them. AI first-look output rendered alongside each candidate.
7. **Diagnostic adaptive engine** — implement routing logic, within-strand ceilings, minimum-evidence floor, all 6 strands run.
8. **Diagnostic UI** — `DiagnosticIntroFlow`, `DiagnosticStrandFlow` with mic check, practice item, tap-to-speak, one-card-at-a-time decoding, replay rules, no metadata.
9. **Diagnostic results computation** — phase placement (decoding-determined), strand priority (independently computed), "why this placement" structured breakdown, confidence with explanation, listening-vs-reading gap.
10. **Diagnostic results UI** — adult-facing dashboard with conservative language.
11. **Passage generation pipeline** — `scripts/content/generate-passages.ts` for batch generation; StoryWeaver/GDL/Gutenberg ingestion.
12. **Passage review queue** — `PassageReviewQueue` admin UI with content audit visible. Reuses the AI first-look reviewer (§6.8) — every passage shows its AI judgment before human approve/reject.
13. **Lesson part generators** — one per lesson part, generating content for a (phase position, daily target) pair. Word lists, sentences, dictation items.
14. **Lesson content review queue** — same review pattern as passages, applied to word lists / sentences / dictation. Same AI first-look pre-read.
15. **Lesson session shell + part flow** — `LessonSessionShell`, `LessonPartFlow` orchestrating the 8 parts.
16. **Re-teach interrupt logic** — error pattern detection, trigger conditions, interrupt UI.
17. **Listen-first vs read-on-own scoring tags** — `LessonSession.connectedTextMode` tracking, dashboard separation.
18. **Lesson-complete kid summary + tutor view** — kid-facing celebration tied to specific evidence; tutor view with story audit, autopilot recommendation, parent-update copy.
19. **Autopilot recommendation engine** — given lesson outcomes, recommend the next daily target with reasoning. Reads from `DailyTargetMastery`.
20. **Wrapping all LLM calls with `recordModelDecision`** — passage generation, item generation, AI first-look reviewer, parent-update copy, autopilot reasoning. Per AGENTS.md LLM Instrumentation Guidance, include equality fixtures.
21. **Tests + manual QA** — see §13.

**Revised effort estimate.** The original 4-6 week estimate was optimistic given the breadth of steps 1-10 (schema, item generation, AI first-look reviewer, review tooling, adaptive routing, voice UI, scoring, dashboard, confidence logic) and the per-content review pipelines added in this revision. Realistic internal estimate:

- **Phase A — Diagnostic MVP (2-3 weeks).** Steps 1-10. Narrow scope: one phase position fully covered, AI-first-look + human review pipeline shippable end-to-end before any student sees an item.
- **Phase B — Lesson + content engine (3-5 weeks).** Steps 11-19. Includes lesson part review queues (not just passages), `DailyTargetMastery` updates, autopilot recommendation.
- **Phase C — Instrumentation + QA (1-2 weeks).** Steps 20-21. Wrapping all LLM calls with `recordModelDecision`, equality fixtures, end-to-end QA on the audit gate, manual review of first batches.

Total realistic effort: **6-10 weeks** of focused engineering for the full content engine. Ship earlier slices behind feature flags as each phase completes.

---

## 13. Test Strategy

- **Unit tests** for: phase-placement logic, within-strand ceiling computation, decodability scoring, content audit, pseudoword phonotactic validation, re-teach trigger conditions, mastery confidence computation.
- **Integration tests** for: every diagnostic and lesson API endpoint covering auth, valid input, invalid input, rate limit behavior, consent-tier-honoring data persistence.
- **End-to-end tests** for: (a) full diagnostic session producing a phase placement with structured breakdown, (b) full lesson session producing per-part scores + autopilot recommendation, (c) content generation → review queue → approval → student session selection chain.
- **Equality fixtures** per AGENTS.md LLM Instrumentation Guidance for every wrapped LLM call.
- **Manual QA** for: kid-facing diagnostic UI feels calm and metadata-free; kid-facing lesson UI feels supportive and not test-like; tutor dashboard claims are defensible against the underlying evidence; story content audit is mechanically correct for sample passages.

---

## 14. Sources & Licensing

| Source | Use | License | Allowed for product |
|---|---|---|---|
| NDL 1.1 lemmatized-for-teaching | Canonical HFW list | CC BY-SA 4.0 (New General Service List Project) | Yes — commercial use permitted with attribution; adapted/redistributed list content carries share-alike obligation |
| StoryWeaver passages | Open passage source | CC BY 4.0 | Yes, with attribution |
| Global Digital Library passages | Open passage source | CC BY / CC BY-SA | Yes, with attribution |
| Project Gutenberg | Public domain texts (older readers) | Public domain | Yes |
| UK Phonics Screening Check | Diagnostic decoding structure | Open Government Licence | Yes, adaptable with attribution |
| CMUdict | Phoneme / pronunciation data | Open source | Yes |
| BNC frequency lists | Frequency validation | CC BY-SA 2.0 UK | Yes, with attribution |
| MorphoLex-en | Morphology research / design reference | CC BY-NC-SA 4.0 (NonCommercial-ShareAlike) | **Design reference only** — not for commercial ingestion without explicit permission from the maintainer |
| Wiktionary morphology data | Morpheme catalog source (build our own) | CC BY-SA 3.0 | Yes, with attribution + share-alike on derivatives |
| IES Practice Guide 21, National Reading Panel, NCIL summary | Research citations | US government / academic | Yes, as citations |
| Hasbrouck-Tindal fluency norms | Fluency benchmark | Published research | Yes, with citation |
| Wilson Reading System (WADE, manual) | Diagnostic / lesson structural reference | Wilson copyright | Design reference only |
| Curriculum Associates Phonics for Reading | Placement test procedural reference | Curriculum Associates copyright | Design reference only |
| CKLA Decoding/Encoding Remediation Supplement | Lesson framing reference | CC BY-NC-SA 3.0 | Design reference only (non-commercial license) |
| UFLI Foundations Toolbox | Lesson architecture reference | UFLI copyright | Design reference only |
| FCRR Student Center Activities | Activity-design reference | FCRR non-commercial | Design reference only |
| Blevins *Phonics from A to Z* | Practitioner methodology synthesis | Scholastic copyright | Design reference only |
| OG Online Academy Advanced Language Morphemes | Advanced morphology reference | OG Online Academy copyright | Design reference only |
| NCII Academic Screening Tools Chart | Validation standards framework | NCII / IES | Yes, as design framework |
| DIBELS / Acadience / GORT / KTEA | Diagnostic design references | Proprietary | Design reference only |

---

## 15. Open Questions for Jonathan (resolve as the spec is executed)

1. **Initial reviewer.** Who reviews the first batch of generated passages and items? Until you can hire a reading specialist as a paid reviewer, you are the reviewer. Plan for ~50-100 passages and ~200-400 items to need initial review before student-ready.
2. **Calibration against your own tutoring practice.** When you have time, run your own example diagnostic and lessons through the system as a test student. Adjust item counts, sentence lengths, and the autopilot recommendation wording where your real practice differs from the defaults in this spec.
3. **Phase 0 scope.** Does Reading Buddy v1 need to support Phase 0 (pre-alphabetic) students fully, or focus on Phases 1-6 with Phase 0 stub-only? Recommendation: Phase 0 stub only in v1, full Phase 0 in v2 once the K-1 use case is validated.
4. **Spanish-language dialect support.** The voice-flywheel consent surface already collects dialect data. Does content v3 need to surface any Spanish-influence-aware content (cognates, common L1 transfer patterns), or is that deferred? Recommendation: deferred to a future spec.
5. **Content rights when adding new states / regions.** When Sýnesis adds a new state Test Prep module (STAAR, FSA, MCAS), does each state need its own content review pass? Each state's test items have their own copyright; the content engine for state-specific Test Prep modules is out of scope for this spec.

---

**End of Content v3 spec.**

This is the foundation document for Reading Buddy's content engine. Together with the Reading Buddy v1 chassis, voice flywheel, data flywheel foundation, and TTS upgrade specs, it defines a complete structured-literacy intervention product. Future per-feature specs (autopilot policy training, miscue classifier, voice vendor evaluation, TDA scoring model, cross-module signal, etc.) layer on top of this base.
