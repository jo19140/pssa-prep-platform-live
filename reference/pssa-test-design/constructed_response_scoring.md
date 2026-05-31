# PSSA ELA Constructed-Response Scoring Reference

Transcribed from official PDE/DRC scoring documents (links in `official_source_inventory.md`). Use for format, rubric structure, and gate design — not for copying any passage/prompt content into product.

## A. Short Answer (SA) — Grade 3 ONLY

Per the test design, Grade 3 carries **2 Short-Answer items, 3 points each** (reading, passage-based). No SA at grades 4–8. Official **3-point** scoring guideline:

- **3 pts** — Complete answer to the task (a correct answer **plus** text-based support); provides specific, appropriate, accurate details (naming, describing, explaining, comparing) or examples.
- **2 pts** — Partial answer (some awareness of task + **at least one** text-based detail); attempts sufficient details, may contain minor inaccuracies.
- **1 pt** — Incomplete answer (misunderstands task **or** no text-based details); insufficient/inappropriate details; **OR the response consists entirely of relevant copied text.**
- **0 pts** — Insufficient material to score; inaccurate in all aspects.

**Design implications (SA item type):**
- Schema needs: `stem`, `passageId`, `expectedAnswerCore` (the correct claim), `acceptableTextSupport[]` (the details/quotes that earn credit), `eligibleContent`, 3-pt rubric instance, `copiedTextCapRule` (pure copy → max 1).
- Gate: **`PSSA_SA_RUBRIC_COMPLETE`** (3/2/1/0 descriptors present, expected answer + acceptable support listed) and **`PSSA_SA_COPIED_TEXT_CAP`** (rubric explicitly caps verbatim-only responses at 1 pt).
- Item demands BOTH an answer and text-based support — the stem must require explanation, not a one-word recall.

## B. Text-Dependent Analysis (TDA) — Grades 4–8 ONLY

Per the test design, grades 4–8 carry **1 TDA item, scored on a 4-point analytic scale, weighted ×4 = 16 points** on the form. No TDA at grade 3. Official **4-point** rubric — each score level spans nine dimensions:

| Dimension | 4 (Effective) | 3 (Adequate) | 2 (Partial) | 1 (Inadequate) |
|---|---|---|---|---|
| Task / analytic understanding | all parts, in-depth | all parts, sufficient | some parts, partial | part(s), inadequate |
| Intro / development / conclusion | effective | clear | weak | minimal evidence |
| Organizational structure | strong, supports focus | appropriate | weak/inconsistent | minimal evidence |
| Analysis of explicit + implicit meaning | thorough | clear | weak/inconsistent | insufficient or none |
| Direct text reference (details, examples, quotes, facts, definitions) | substantial, accurate | sufficient, accurate | vague | insufficient |
| Main-idea + key-detail reference | substantial | sufficient | weak | minimal |
| Transitions | skillful | appropriate | inconsistent | few if any |
| Precise language / domain vocab from text | effective | appropriate | inconsistent | little or none |
| Conventions (sentence formation, grammar, usage, spelling, capitalization, punctuation) | few/no errors; don't interfere | some; seldom interfere | errors may interfere | many; often interfere |

**Design implications (TDA item type):**
- Schema needs: `prompt` (an "analyze how the author develops / how X relates to Y" task), `passageId(s)` (can be single or paired), `eligibleContent` in the E reporting category, `expectedClaim`, `acceptableEvidence[]`, `organizationExpectation`, `analysisExpectation` (must require explicit + implicit), per-dimension 4-point rubric instance, `scoreWeight=4`, `copiedTextHandling`, `offTopicHandling`.
- Gate: **`PSSA_TDA_RUBRIC_ANALYTIC_COMPLETE`** (all nine dimensions present at all four levels; expected claim + acceptable evidence listed; weight ×4 recorded), reusing/extending the existing `PSSA_TDA_RUBRIC_GENERIC` / `PSSA_TDA_EXPECTED_CLAIM_MISSING` / `PSSA_TDA_EVIDENCE_GUIDANCE_MISSING` gates from the Grade-6 exemplar.
- The prompt must be genuinely **analytic** (how/why the author builds an idea), not summary or opinion.

## C. Student Writer's Checklist (Grades 4–8 TDA) — student-facing scaffold

PLAN: read the question carefully · read the whole passage · think how question relates to passage · organize ideas on scratch paper (thought map/outline).
FOCUS: analyze passage information as you write · use evidence from the passage · use precise language, varied sentence types, transitions · organize with introduction, body, conclusion.
PROOFREAD: wrote final essay in answer booklet · stayed focused on the question · used evidence · corrected capitalization, spelling, sentence formation, punctuation, word choice.

Useful as the TDA student-preview scaffold and as a source of the "expected response" criteria the reviewer preview should check against.

## D. What this closes
SA (Grade 3) and TDA (Grades 4–8) were the two item types with **no exemplar in the screenshot archive**. With these official rubrics we can now design both as first-class item types with real, gate-checkable scoring — completing the full PSSA ELA item-type set (MC/TE 1-pt · EBSR/TE multipoint · SA · TDA).
