# PSSA PR #4f-b — Regenerate Grade 4 Pilot Passages (per-passage authoring, gated)

Grade 3 is the proven reference: 5 genuinely-authored passages + 28 grounded, skill-matched items, all gates green. Now do the same for Grade 4 passages. Author one passage at a time. File-only. Commit. Grade 4 ONLY.

Do NOT regenerate other grades. Do NOT author items (reading or TDA). Do NOT approve, import, or write to the DB.

## Hard anti-template rule
The failure mode was structural skeleton reuse, not just repeated topics. **Vary the shape, not just the subject.** Each passage has its own topic, structure, voice, situation, and concrete details. No shared narrative skeleton across passages; no "a team investigates X and makes a plan" frame. Vary structure (narrative, descriptive, sequential/process, problem–solution, compare/contrast, cause/effect, biography/profile, how-something-works), voice/POV, and situation. Include at least one literary passage; informational dominant overall. Do NOT reuse Grade 3's specific topics or structures (no second creek-water, lunch-line, map, mural, or cart passage) — Grade 4 must feel like a distinct set.

## Scope
- Author exactly 5 Grade 4 passages, 300–500 words, grade-4-appropriate (slightly more complex sentences/vocabulary than Grade 3; still concrete).
- Replace the existing Grade 4 templated pilot passages only.
- `reviewStatus = PENDING`, `itemStatus = candidate`, `sourceType = internal_original`, license cleared. No items authored.
- Informational passages: `factCheckStatus = HUMAN_REVIEW_REQUIRED`, `factualClaimsReviewed = false`, `containsAttributedQuotes = false`, no fabricated attributed quotes.
- Each passage must be rich enough to support EC-aligned items LATER, including Grade 4's reading ECs (A/B) and the Text-Dependent Analysis (E) item type — i.e., enough substance, a clear claim/arc, and analyzable author moves that a TDA prompt could draw evidence from.

## Per-passage authoring loop (one at a time)
For each Grade 4 passage:
1. Author one concrete passage with a distinct topic, structure, voice, situation; named specifics, observable details, a clear sequence/arc/claim/conflict; enough textual evidence for main-idea, inference, vocabulary-in-context, sequence/structure, evidence-use, and TDA.
2. Immediately run all four gates: `PSSA_PASSAGE_CROSS_DUPLICATE`, `PSSA_PASSAGE_TEMPLATE_SKELETON`, `PSSA_PASSAGE_TOPIC_COHERENCE`, `PSSA_PASSAGE_CONCRETENESS`.
3. Run each new passage against: every already-authored Grade 4 passage in this PR; the approved Grade 3 passages; the approved tranche/exemplar passages; the full pilot corpus where applicable.
4. If it FAILs any gate (or has an unjustified coherence WARN), reject and regenerate it. Do not proceed with a failing passage.

## Composition
5 passages across different domains AND structures; no single topic domain > 40% of the Grade 4 set. Draw from science/nature, history/social studies, school/community, arts/culture, everyday problem-solving, literary fiction — distinct from the Grade 3 topic set.

## Acceptance (Grade 4)
- 5/5 PASS `PSSA_PASSAGE_CROSS_DUPLICATE` (including against Grade 3 + tranche/exemplar)
- 5/5 PASS `PSSA_PASSAGE_TEMPLATE_SKELETON` (no shared skeleton hash; no topic-swap reskins; no skeleton shared with Grade 3)
- 5/5 PASS `PSSA_PASSAGE_CONCRETENESS`
- 5/5 PASS or justified WARN `PSSA_PASSAGE_TOPIC_COHERENCE`
- zero FAIL overall; no identical sentence of 8+ words across any two passages (within Grade 4 or vs. any existing approved passage)
- human preview shows the passages feel genuinely authored, not metric-compliant

## Output
Write the Grade 4 passages under `exemplars/pssa_grade4_pilot/` (passages only; keep the old Grade 4 reading items quarantined/PENDING — they will be re-authored next). Generate: a readable Grade 4 passage preview; the four passage-gate reports; a cross-passage audit summary for Grade 4 + all existing approved passages. Preview includes per passage: `passageId, title, gradeLevel, topicDomain, structureType, voice/POV, passage text, gate summary, concretenessRatio, topicCoherenceScore, any WARN justification`.

## Verification
```
npx tsc --noEmit
npm run build
npm run test:pssa-content
npm run content:audit-pssa
```
Commit the Grade 4 passages, reports, preview, and any script updates. Do not leave untracked files.

## Stop
Report the Grade 4 gate table (PASS/WARN/FAIL by rule), the 5 readable passages, any WARN justifications, confirmation no items were authored, and confirmation no approvals/imports/DB writes occurred. Do NOT proceed to Grades 5–8 — those follow only after human approval of this Grade 4 preview, and then the Grade 4 reading + TDA items are re-authored on these passages.
