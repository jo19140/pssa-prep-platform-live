# Phase 4 R-Controlled Entry — content (worked exemplar: r_controlled_ar)

Status: APPROVED by Jonathan 2026-06-04 with four cleanup edits, all applied and re-validated (ar inference question regrounded in text; or sun/north sentence corrected; er/ir/ur pronoun ambiguity resolved as "Her bird sat on her hand" — noun clarity without the curb/bird trigram collision; ar vocabulary yarn→yard so both vocabulary words appear in the lesson text). Engine prerequisites both MERGED to main: mini-PR 4ce688e + legacy-gate pseudoword fix 966d3b8 — the content PR adds the regression test but must NOT reimplement the fix. Review-set default (closed + VCe, no team spiral review yet) confirmed. Codex-ready.
Targets: r_controlled_ar [r_ar] (17), r_controlled_or [r_or] (18), r_controlled_er_ir_ur [r_er, r_ir, r_ur] (19).

## Engine fix applied during exemplar authoring (COMMITTED 966d3b8)

The worked exemplar exposed a residual mini-PR gap: the legacy gate `LESSON_PHASE3_NO_RCONTROLLED` flags r-controlled PSEUDOWORDS as violations because its phoneme check can't match words absent from CMUdict. (Tell: zarb/varn passed — they happen to be CMUdict name tokens — while jarm/marb/narp/sarb/parn/tarb failed.) The new named admission gate already had the right exception; the legacy gate now mirrors it: in `auditPart3`, pseudowords that DETECT to a declared r-controlled target are excluded from the legacy scan. 7-line change in `lib/literacy/lessonAudit.ts`, all five suites re-run green. The content PR must add the regression test: an r_ar draft using non-CMUdict pseudowords passes `LESSON_PHASE3_NO_RCONTROLLED`.

## Design flag for Jonathan (default chosen, your call)

Allowed-review set kept at closed + all VCe (Entry/Mid convention) — taught vowel teams remain BLOCKED in r lessons. The alternative is cumulative spiral review (allow team_ai/ay/ee/ea/oa/igh as review so rain/boat/light may appear). Default keeps this rung identical in shape to everything validated so far; cumulative review is pedagogically defensible and can be introduced later as a deliberate change across all Phase 4 content.

## Worked exemplar: r_controlled_ar — ALL GATES PASS

Seed: patterns ["r_ar"], pseudowordPatterns ["r_ar"]; allowed = closed + VCe; blocked = all teams + diphthongs + r_er/r_ir/r_or/r_ur. exampleWords: car, park, barn, farm, star, dark, hard, yard. exampleNonwords (validator-clean; "garn" was REJECTED by the new real-word check during authoring): zarb, varn, jarm, marb, narp, sarb, parn, tarb.

Demo pairs (closed → ar, onset/coda preserved): cat→cart, had→hard, ban→barn, pat→part. Line 2: those 8. Line 3: star, dark, yard, lake, hand, desk, home. Hearts: said/was/they + I/a/the/to. Vocabulary: cart, yard.

Sentences: Carl has a car at the farm. / The barn is dark and big. / "Park the car in the yard," said Carl. / It is hard to spot a star. / Mark made a tart at home. / The dog can bark in the dark.
Dictation: car, park, barn, farm, hard, dark + first two sentences.
Comprehension: How can you tell the car was hard to start? (inference) / What did Carl set on the cart? (literal) / Tell me what happened at the farm. (retell) / What job would you do on a farm? (personal_connection)

Short fixture (45w, clean): "Carl woke up at the farm. The barn was still dark. …" (A Fine Start at the Farm).

fullAuditPassageText (90 words — decod 1.000, 0 unclassified, 0 blocked, 0 repeated trigrams, passesAuditGate TRUE, canPersist TRUE, LESSON_PHASE4_RCONTROLLED_ALLOWED_FOR_TARGET PASS, Part 2 pairs PASS):

> Carl woke up at the farm. The barn was still dark. "Park the cart in the yard," said Marge. Carl set a lamp on the cart. Bart came up the path in a car. "It is hard to start the car," said Bart. Carl gave him a hand. The car gave a sharp snap. At last it ran. Marge fed the hens at the gate. A star came up far in the dark. Bart said, "It is a fine farm." Carl had a big smile. It was a fine start.

Authoring constraints confirmed for r lessons: no for/or (r_or), no her/bird/turn (other r families), no team words (see/day/play/boat/light) under the default review set, no inflections on ar stems (cars/barks/stars banned; hens fine — stem not target), names carry the target (Carl, Marge, Bart, Mark all phoneme-match r_ar).

## ALL THREE TARGETS AUTHORED + VALIDATED (2026-06-04)

| target | full passage | decod | unclassified | blocked | trigrams | gate | canPersist | named gate | coverage | short |
|---|---:|---:|---:|---:|---:|---|---|---|---|---|
| r_controlled_ar | 90w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | n/a | 45w clean |
| r_controlled_or | 87w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | n/a | 36w clean |
| r_controlled_er_ir_ur | 93w | 1.000 | 0 | 0 | 0 | TRUE | TRUE | PASS | PASS | 37w clean |

### r_controlled_or — "The Storm at the Fort" (order 18)

Pairs: shot→short, pot→port, cod→cord, ton→torn. exampleWords: corn, fork, storm, horn, north, porch, short, fort. Nonwords (validator-clean): vorm, zorb, jorm, morb, norp, torb, dorb, lorm. Sentences: The storm hit in the north. / A horn went off at the fort. / "Hold the fork," said Norm. / The corn is on the porch. / Mort can sort the caps. / "Step off the cord," said Dot. Dictation: corn, fork, storm, horn, short, port. Vocabulary: fort, cord.

Full passage (87w): Norm woke up at the fort. A storm hit from the north. The wind bent the corn. "Shut the porch gate," said Mort. Dot got the cord for the flag. The horn went off in the storm. Norm held his fork at lunch. "This corn is hot," said Dot. Mort had to sort the caps. At last the storm went past. The sun came up at last. "It was a short storm," said Norm. They sat on the porch with corn. The fort was safe and still.

### r_controlled_er_ir_ur — "The Bird That Can Twirl" (order 19)

Pairs (one per family + one extra ur): ten→tern, fist→first, cub→curb, hut→hurt. exampleWords (first 5 span er/ir/ur): her, bird, turn, fern, girl, curb, first, burn. Nonwords (3 er + 3 ir + 2 ur, validator-clean): nerb, zerb, derm, jirt, virn, nirt, murb, gurb. Sentences: The bird sat on the curb. / "Turn at the third hut," said Bert. / Her fern is in the dirt. / The girl hurt her hand. / Kurt has a firm grip. / "The sun can burn the fern," said Gert. Dictation: her, bird, turn, first, hurt, burn. Vocabulary: fern, curb.

Full passage (93w): Fern is a girl with a bird. The bird can chirp and turn. "Her bird is the first to sing," said Bert. Kurt sat on the curb. The bird went up in a swirl. It came back at the third turn. "That bird can twirl," said Kurt. Fern fed the bird a crust. The bird gave a chirp. Gert had a fern in a pot. "It must not burn in the sun," said Gert. Fern set the pot at the curb. Her bird sat on her hand. It was her best turn yet.

## Authoring findings (this rung)

- **"for" unlock:** "for" phoneme-matches r_or and classifies as a target word in r_or lessons — used in the passage ("the cord for the flag"), big natural-prose gain. Same logic admits "or" itself if ever needed.
- **Monosyllable constraint:** "never" passes the strict phoneme gate (N EH V ER contains ER) but the passage classifier leaves it unclassified — multisyllabic r-words (never/under/winter) behave inconsistently between the two paths. Constraint for this rung: r-controlled words in passages stay MONOSYLLABIC (+ names). Characterizing/fixing the multisyllable classifier path is a separate future item, not this PR.
- Names carry targets across all three lessons: Carl/Marge/Bart/Mark (ar), Norm/Mort (or), Fern/Bert/Kurt/Gert (er/ur).

## Status

Sign-off COMPLETE (2026-06-04, all four cleanup edits applied). Codex spec: specs/phase4-rcontrolled-content-codex-spec.md. Next: commit both docs → Codex on a fresh branch from main → independent audit. The required regression (Jonathan, verbatim): an r_ar draft using non-CMUdict pseudowords like jarm/marb/narp/sarb/parn/tarb does not trigger LESSON_PHASE3_NO_RCONTROLLED when those pseudowords detect to declared r_ar.
