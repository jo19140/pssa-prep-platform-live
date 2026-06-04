# Phase 4 R-Controlled Entry — content (worked exemplar: r_controlled_ar)

Status: DRAFT for Jonathan's sign-off. 2026-06-04. Targets locked earlier: r_controlled_ar [r_ar] (17), r_controlled_or [r_or] (18), r_controlled_er_ir_ur [r_er, r_ir, r_ur] (19).
COMMIT THIS FILE + the lessonAudit fix below PROMPTLY (uncommitted-doc-loss pattern).

## Engine fix applied during exemplar authoring (uncommitted — commit first)

The worked exemplar exposed a residual mini-PR gap: the legacy gate `LESSON_PHASE3_NO_RCONTROLLED` flags r-controlled PSEUDOWORDS as violations because its phoneme check can't match words absent from CMUdict. (Tell: zarb/varn passed — they happen to be CMUdict name tokens — while jarm/marb/narp/sarb/parn/tarb failed.) The new named admission gate already had the right exception; the legacy gate now mirrors it: in `auditPart3`, pseudowords that DETECT to a declared r-controlled target are excluded from the legacy scan. 7-line change in `lib/literacy/lessonAudit.ts`, all five suites re-run green. The content PR must add the regression test: an r_ar draft using non-CMUdict pseudowords passes `LESSON_PHASE3_NO_RCONTROLLED`.

## Design flag for Jonathan (default chosen, your call)

Allowed-review set kept at closed + all VCe (Entry/Mid convention) — taught vowel teams remain BLOCKED in r lessons. The alternative is cumulative spiral review (allow team_ai/ay/ee/ea/oa/igh as review so rain/boat/light may appear). Default keeps this rung identical in shape to everything validated so far; cumulative review is pedagogically defensible and can be introduced later as a deliberate change across all Phase 4 content.

## Worked exemplar: r_controlled_ar — ALL GATES PASS

Seed: patterns ["r_ar"], pseudowordPatterns ["r_ar"]; allowed = closed + VCe; blocked = all teams + diphthongs + r_er/r_ir/r_or/r_ur. exampleWords: car, park, barn, farm, star, dark, hard, yard. exampleNonwords (validator-clean; "garn" was REJECTED by the new real-word check during authoring): zarb, varn, jarm, marb, narp, sarb, parn, tarb.

Demo pairs (closed → ar, onset/coda preserved): cat→cart, had→hard, ban→barn, pat→part. Line 2: those 8. Line 3: star, dark, yard, lake, hand, desk, home. Hearts: said/was/they + I/a/the/to. Vocabulary: cart, yarn.

Sentences: Carl has a car at the farm. / The barn is dark and big. / "Park the car in the yard," said Carl. / It is hard to spot a star. / Mark made a tart at home. / The dog can bark in the dark.
Dictation: car, park, barn, farm, hard, dark + first two sentences.
Comprehension: Why was it hard to start the car? (inference) / What did Carl set on the cart? (literal) / Tell me what happened at the farm. (retell) / What job would you do on a farm? (personal_connection)

Short fixture (45w, clean): "Carl woke up at the farm. The barn was still dark. …" (A Fine Start at the Farm).

fullAuditPassageText (90 words — decod 1.000, 0 unclassified, 0 blocked, 0 repeated trigrams, passesAuditGate TRUE, canPersist TRUE, LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET PASS, Part 2 pairs PASS):

> Carl woke up at the farm. The barn was still dark. "Park the cart in the yard," said Marge. Carl set a lamp on the cart. Bart came up the path in a car. "It is hard to start the car," said Bart. Carl gave him a hand. The car gave a sharp snap. At last it ran. Marge fed the hens at the gate. A star came up far in the dark. Bart said, "It is a fine farm." Carl had a big smile. It was a fine start.

Authoring constraints confirmed for r lessons: no for/or (r_or), no her/bird/turn (other r families), no team words (see/day/play/boat/light) under the default review set, no inflections on ar stems (cars/barks/stars banned; hens fine — stem not target), names carry the target (Carl, Marge, Bart, Mark all phoneme-match r_ar).

## Remaining before Codex

1. Jonathan sign-off on this exemplar + the review-set default.
2. Author + validate r_controlled_or (pair candidates: shot→short, pot→port, cod→cord — got→"gort" invalid) and r_controlled_er_ir_ur (three-grapheme coverage; pairs from all three families: ten→tern, fist→first, cub→curb).
3. Full Codex spec: seed (PHASE_4_RCONTROLLED position + 3 targets), content entries, seed script, test file mirroring phase4-mid (admission matrix per target + LESSON_PHASE3_NO_RCONTROLLED pseudoword regression + bare-code gate + style sweep), the lessonAudit fix as part of the PR if not committed separately first.
