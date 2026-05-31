# PSSA ELA Item-Type Catalog — Master Index

Built 2026-05-31 from Jonathan's Desktop screenshot archive (154 images) + the official PDE/DRC **PSSA ELA Test Design (Feb 2025)**, saved at `reference/pssa-test-design/pssa_ela_test_design_2025.pdf`. Per-folder detail files in this directory:

- `grade3.md` — DRC INSIGHT Grade 3 training set (Q1–14)
- `grades456.md` — Grade 4 / 5 / 6 training items
- `tech_questions_1.md`, `tech_questions_2.md` — the 53-shot "Tech Questions" TE archive (Grades 3–8)
- `type_of_questions.md` — i-Ready lesson previews + PSSA DFA reference charts
- `competitor_star_iready.md` — STAR + i-Ready (competitor reference)

Classification only — no commercial-restricted passage text reproduced.

## 1. What the official blueprint requires (the real target)

1-point items = **MC *or* TE** (interchangeable). Multi-point = **EBSR *and/or* TE**. The test constrains **points × reporting category**, not interaction-type counts. Per form:

| | Grade 3 (45 pts) | Grades 4–8 (63 pts) |
|---|---|---|
| Passage reading 1-pt (MC/TE) | 19–23 | 22–28 |
| Standalone conventions 1-pt (D) | 9 | 9 |
| Multipoint EBSR/TE | 3–4 (≥1 two-pt, ≥1 three-pt) | 4–6 (≥2 two-pt, ≥2 three-pt) |
| Short Answer (3 pt) | **2** | 0 |
| TDA (×4 = 16 pt) | 0 | **1** |
| Passages/form | 4 (+1 FT) | 4 (+1 FT) |

Category points: Lit(A) 15–21/23 · Info(B) 15–21/23 · Conventions(D) **9 every grade** · TDA(E) **16, G4–8 only**.

## 2. TE interaction formats actually observed (with sub-variants)

The archive confirms the six top-level formats — **and reveals sub-variants my mockups didn't cover.** This is the real palette:

| Top-level format | Sub-variants seen in the archive | Grades |
|---|---|---|
| **Multiple Choice** (single) | standard 4-option | all |
| **Multiple-Select** | checkbox list; the Grade-3 "check-mark-on-blank-line" notes widget | 3–7 |
| **Inline Drop-down** | (a) single drop-down; (b) **multiple** drop-downs in one paragraph; (c) **reading-comprehension phrase** drop-downs (not just grammar) | 3–8 |
| **Matching Grid/Table** | (a) one-box-per-row (e.g. Text 1 / Text 2 / Both); (b) **multi-box-per-column** (multiple checks per column) | 3–7 |
| **Hot-Text** | (a) **select word** from inline `[word / word]` pairs (spelling); (b) **select one underlined word** (capitalization/usage); (c) **select two phrases/sentences** by highlighting (vocab/evidence) | 3–8 |
| **Drag-and-Drop** | (a) drag-into-bucket (evidence boxes); (b) **drag-to-order/sequence** ("will not use all" distractors); (c) **drag punctuation tokens into blanks** (comma, em-dash — a cloze-by-drag); (d) **drag-replace full sentence into a table cell** (MC-via-drag sentence revision); (e) drag-into-table | 3–8 |
| **EBSR** (two-part) | Part One MC + Part Two multi-select evidence; answered via a "Select to Respond" overlay | all |
| **Short Answer** (CR) | Grade 3 only; 2 × 3-pt — **no exemplar in archive** | 3 |
| **TDA** (CR essay) | Grades 4–8; 1 × 16-pt — **no exemplar in archive** | 4–8 |

### Two edge interactions flagged for schema sub-typing
- **Punctuation-token drag** (G7): draggable glyphs (comma, em-dash, ellipsis) dropped into in-sentence blanks — answer key is tokenized, behaves like inline-cloze, not phrase-bank drag.
- **Drag-replace full sentence into table** (G7): mutually-exclusive full-sentence variants = single-select MC implemented as drag; scoring is MC-like.

## 3. Cross-grade coverage observed

Every TE format recurs across the grade band 3–8 (DRC vertically-scales a small template set: the "Text 1 / Text 2 / Both" integration grid, two-phrase "don't rush" hot-text, and event-sequence drop-downs all reappear nearly verbatim across grades). So one well-built schema per format carries across all grades.

## 4. Gaps the archive does NOT fill
- **No Short-Answer (G3) exemplar** and **no TDA (G4–8) exemplar** anywhere in 154 images. Both constructed-response types must be sourced from PA released forms (the 166-pg `2015 pssa iss ela grade 6.pdf` in PSSA Samples is a released item-and-scoring sampler — likely contains a TDA + rubric).

## 5. Conventions (D) strand is mostly technology-enhanced
The Grade-3 training Q1–6 and much of Tech Questions show the 9-point conventions strand delivered as **hot-text word-select (spelling/capitalization), drop-down (spelling), and punctuation-token drag** — not the old passage-free "Which sentence demonstrates…" MCQ frame. The templated conventions pile should be rebuilt into these TE formats.

## 6. Competitor reference (STAR / i-Ready)
- **STAR**: 100% single-select MC (adaptive vocab + comprehension). No TEI. Its high-volume **cloze-sentence vocabulary** style is a cheap, scalable format worth borrowing.
- **i-Ready** design ideas with no PSSA analog: evidence-targeted "find the sentence" hot-text; multi-blank/compare dual-passage drop-downs; option-level audio read-aloud; persistent two-pane passage layout; pacing-nudge + avatar feedback (product/UX, not item-type).
