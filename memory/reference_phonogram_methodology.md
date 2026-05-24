# Reference — Phonogram Methodology

**Status:** Working reference for product, content, and Codex agents
**Last updated:** 2026-05-24
**Authoritative companion specs:** `specs/reading-buddy-v1-codex-spec.md` (schema, surfaces, acceptance criteria), `specs/v2-content-pipeline-codex-spec.md` (phonogram dataset generation)

This document captures the pedagogical framework that governs all literacy behavior in Reading Buddy and the Sýnesis literacy program. It is referenced by `PRODUCT_VISION.md`, `AGENTS.md`, and the v1 implementation spec.

The substantive source materials (Ehri, Blevins, Moats, Adams, Seidenberg, Treiman, Cunningham) are uploaded reference PDFs held outside the repo for copyright reasons. **Do not seed application content from those PDFs.** The phonogram inventory used by the application comes from the v2 content pipeline (CMUdict + SUBTLEX + AWL alignment), not from the reference texts.

---

## Frameworks We Commit To

The Reading Buddy product is built on four anchoring frameworks:

1. **Ehri's four phases of word reading** — developmental model for how children move from pre-alphabetic to consolidated alphabetic reading. Used for placement and growth tracking.
2. **The six syllable types** — Closed, Open, VCe (vowel-consonant-e), Vowel Team, R-Controlled, Consonant + le. Used for decoding instruction and mastery tracking.
3. **Phonogram-by-analogy decoding** (Blevins / Cunningham word-family tradition) — children learn high-frequency rime patterns (e.g., `-ake`, `-ight`, `-tion`) and decode unfamiliar words by analogy to known patterns. The application's word-splitting scaffolding splits on real phonogram boundaries from the seeded `PhonogramFamily` data, **not** on arbitrary syllables.
4. **The 6-strand literacy model** — Phonemic Awareness, Decoding, Morphology, Fluency, Vocabulary, Comprehension. Used as the structure for the literacy profile, strand scores, and adult-facing dashboards.

These four are deliberately compatible: Ehri provides the developmental arc, the six syllable types provide the decoding scope-and-sequence, phonograms provide the practice unit, and the 6 strands provide the reporting structure.

## Ehri's Four Phases — Application Use

| Phase | What it means | Application signal |
|---|---|---|
| **Pre-Alphabetic** | Recognizes words by visual features (e.g., the McDonald's M), not letter-sound mapping | Cannot reliably decode CVC words; relies on memorization |
| **Partial Alphabetic** | Uses some letter-sound knowledge, often initial/final letters | Decodes CVC inconsistently; substitutions are letter-shape-driven |
| **Full Alphabetic** | Decodes systematically letter-by-letter | Decodes CVC reliably; multisyllable words are slow and effortful |
| **Consolidated Alphabetic** | Reads by chunks — phonograms, morphemes, common syllables | Multisyllable words decoded by recognized chunks, not letter-by-letter |

Adult-facing UI **leads with Ehri phase placement** as the headline metric. Lexile and grade-equivalent are secondary supporting tags. The `EhriPhase` enum in the Prisma schema models this directly.

## The Six Syllable Types

Modeled by the `SyllableType` enum. Used for both decoding instruction and the syllable-type mastery grid on the teacher student-detail surface.

- **Closed (CVC):** `cat`, `lap`, `pen`. Short vowel.
- **Open:** `go`, `she`, `hi`. Long vowel.
- **VCe (silent-e / magic-e):** `make`, `time`, `rope`. Long vowel + silent e.
- **Vowel Team:** `boat`, `eat`, `rain`. Two vowels working together.
- **R-Controlled:** `car`, `bird`, `fern`. Vowel + r.
- **Consonant + le:** `table`, `little`, `purple`. Final stable syllable.

## Phonogram-by-Analogy Decoding

A **phonogram** is a rime — the vowel and what follows it in a syllable (e.g., `-ake`, `-ight`, `-ight`, `-urn`). Children who know the phonogram `-ake` can decode any new word ending in `-ake` (`bake`, `flake`, `mistake`, `pancake`) by analogy.

The `PhonogramFamily` model stores phonograms with:

- A code (`-ake`, `-ight`, `-tion`)
- A category (long-a, long-i, r-controlled, etc.)
- The syllable type it belongs to
- Example words
- An `introductionOrder` integer that reflects the **Blevins pedagogical sequence** — high-utility short-vowel phonograms first, then long vowels, then r-controlled and consonant + le, then multisyllabic and morphological patterns.

Mastery is tracked per phonogram in `PhonogramMastery` (correct attempts, total attempts, last seen, mastery level). The mastery grid on the teacher student-detail surface visualizes the full inventory colored by the student's level on each.

**Acceptance from the v1 spec:** word-splitting scaffolding ("dis · ap · peared") splits on real phonogram boundaries from `PhonogramFamily`, not arbitrary syllables.

## The 6-Strand Literacy Model

Modeled by the `LiteracyStrand` enum. Each student has six `StrandScore` records (one per strand) with a 0-100 score, a `MasteryLevel`, and an optional `priorityRank` (1 = highest-leverage gap).

| Strand | What it covers |
|---|---|
| **Phonemic Awareness** | Hearing and manipulating sounds in spoken words |
| **Decoding** | Mapping letters/letter combinations to sounds; reading unfamiliar words |
| **Morphology** | Roots, prefixes, suffixes; word-part meaning |
| **Fluency** | Accuracy, rate, prosody of connected text reading |
| **Vocabulary** | Word meanings; Tier 1, Tier 2, Tier 3 inventory |
| **Comprehension** | Meaning-making from text |

The strand panel renders all six on the teacher student-detail surface. The parent dashboard translates strand evidence into plain-English summaries ("Maya gained another month of reading this week"), not metric dumps.

## What This Means For Content

- **Decoding items** must target a specific phonogram or syllable type and be tagged with both.
- **Passages** for fluency and comprehension should be tagged with the phonograms they contain (so the autopilot can prioritize passages that reinforce a developing phonogram).
- **Vocabulary** uses a Tier 2 inventory (academic words across domains); the v2 pipeline produces the AWL alignment.
- **Speed drills** select content from the student's *developing-tier* phonograms — never random.

## What This Means For The Autopilot

The autopilot decision engine (see `AutopilotDecision` model) is responsible for selecting the next activity based on the literacy profile. Decisions must be made on:

- Ehri phase placement and confidence
- Strand priority ranks
- Phonogram and syllable-type mastery distributions
- Recency of practice on each
- Stalls (no growth on a strand for N weeks → consider strand switch)

Every decision is logged with adult-readable summary text ("switched to morphology focus because comprehension stalled 3 weeks") that the teacher and parent see.

## Terminology Discipline

- Use **"striving readers"** — never "struggling."
- Use **"phonogram"** as the unit, not "rime" (more recognizable to non-specialist parents).
- Use **"syllable type"** with the full six-type taxonomy; do not collapse them.
- Use **"decoding"** for the process; use **"phonogram-by-analogy"** for the specific strategy when needed.
- Use **"6-strand literacy profile"** when naming the structure for parents and teachers.

## What Is Out Of Scope For The Application Right Now

- **No phonics-only stance.** The product uses systematic phonics within a broader 6-strand model. Do not strip back to phonics-only just because the phonogram work is visible.
- **No race or ethnicity inference.** Dialect-aware does not mean demographic inference. See `AGENTS.md` for the hard limits.
- **No clinical or diagnostic language for learning differences.** "Early-flag for learning differences" is on the spec backlog and deferred indefinitely. Reading Buddy does not diagnose dyslexia or any other condition.

## Open Items

- Final selection of which Tier 2 vocab inventory to seed (AWL alone, AWL + General Service List, or a custom alignment).
- Passage strategy decision (licensed vs. AI-generated vs. hybrid) — owned by the forthcoming v3 content generation spec.
- Sub-phase granularity within Ehri's Consolidated Alphabetic phase for older readers (grades 6-8) — current schema models the four canonical phases only.
