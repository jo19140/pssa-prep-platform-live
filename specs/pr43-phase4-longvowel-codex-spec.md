# PR #43 — Phase 4 Entry: long-vowel team CONTENT (4 sound-grouped targets)

Builds on the merged Phase 4 engine foundation (`patternRegistry.ts` + `cmudictPhonemes.ts` + phase-aware r-controlled gate, commit `0658288`). **This PR adds CONTENT + SEED + two new gates only — no matcher/registry/engine changes.** All Phase 3 behavior stays byte-identical. Branch from latest `main`. Commit.

## Scope
Four Phase-4-Entry long-vowel-team `DailyTarget`s, each a multi-pattern target using **registry codes** (mirrors Phase 3 Mid's `targetPatterns` infra):

| Target code | `targetPatternsJson.patterns` | Kid-facing label |
|---|---|---|
| `team_long_a` | `["team_ai","team_ay"]` | long a teams (ai, ay) |
| `team_long_e` | `["team_ee","team_ea"]` | long e teams (ee, ea) |
| `team_long_o` | `["team_oa"]` | long o team (oa) |
| `team_long_i` | `["team_igh"]` | long i team (igh) |

`ow`/`ie`/`oo` are deferred (ambiguous → diphthong PR #44). Prerequisites for all four: Phase-3 closed syllables + all 5 VCe + consonant digraphs (th/sh/ch) + heart words. NO r-controlled, NO open-syllable function words (by/my/we/he/go/so…), NO inflections on the target team, NO cross-team words (a `team_long_o` lesson must contain zero ai/ay/ee/ea/igh words).

### Heart-word exception to cross-team contamination (Pro — REQUIRED, removes a contradiction)
Declared heart words in `heartWordsPreviewedThisLesson` / `heartWordsAssumedKnown` are **allowed even if their spelling contains another team's grapheme** (e.g. `said` contains `ai` but is a heart word, so it may appear in a `team_long_e`/`team_long_o`/`team_long_i` lesson). They are taught as whole words, not decoded. However:
- heart words may NOT count as target-team evidence;
- heart words may NOT appear in `demonstrationPairs`, `contrastiveLine2`, `contrastiveLine3`, `dictatedWords`, `exampleNonwords`, or target-word counts unless they genuinely classify to the declared registry pattern;
- the audit must report heart-word exemptions separately;
- any **undeclared** cross-team word still FAILS `LESSON_PHASE4_PATTERN_IN_TARGET_SET` / the cross-team gate.

(My in-sandbox validation already applied exactly this exemption — `said`/`was`/`they` are the only "team-letter-bearing" words allowed off-target, and only because they're declared heart words.)

## NON-NEGOTIABLE: registry codes only (Pro)
Phase 4 content targets, `targetPatterns`, nonword detection expectations, and lesson metadata MUST use registry codes (`team_ai`,`team_ay`,`team_ee`,`team_ea`,`team_oa`,`team_igh`). **Bare `ai`/`ay`/`ee`/`ea`/`oa`/`igh` are forbidden** (they hit the unsafe Phase-3 substring path). Two new BLOCKING gates enforce this:
- **`LESSON_PHASE4_NO_BARE_TEAM_CODES`** — fail the PR if any Phase-4 target/`targetPatterns`/nonword-detection-expectation/metadata uses a bare team code.
- **`LESSON_PHASE4_PATTERN_IN_TARGET_SET`** — every target real word AND every pseudoword in a lesson must classify (via `wordMatchesPattern` with `strictPhonemeLexicon:true`) into one of that lesson's declared registry patterns. For `team_long_a`, only `team_ai`/`team_ay` are acceptable detections.

## Architecture
- **New content module** `lib/content/phase4EntryLessonContent.ts`, `PHASE_4_ENTRY_LESSON_CONTENT: Record<string, Phase3EntryLessonContent>` (reuse the existing `Phase3EntryLessonContent` type — same 13 fields, now incl `exampleNonwords`). Keyed by the 4 target codes.
- **Content resolver:** extend the generator's content lookup (`buildLessonGeneratorContext` / wherever `PHASE_3_ENTRY_LESSON_CONTENT[code]` is read) to consult the Phase 4 map for Phase 4 targets — merged registry or phase-keyed lookup, mirroring how Phase 3 Mid threaded multi-pattern content. **Generators themselves stay unchanged** (they already read demonstrationPairs/sentences/etc. by target code and are multi-pattern-aware from Phase 3 Mid).
- **New seed** `scripts/content/seed-phase4-entry.ts` (mirror `seed-phase3-mid.ts`): a Phase 4 `phasePosition` + 4 `DailyTarget`s with `targetPatternsJson: { patterns: [...] }`; validate each declares its registry patterns and each nonword detects to one of them (reuse the Phase-3-Mid seed-time assertion). npm `content:seed-phase4-entry`.
- Phase 3 content/seed/generators untouched (Rule 0).

## The 4 validated content entries (inline — transcribe verbatim)

```ts
team_long_a: {
  demonstrationPairs: [{closed:"ran",target:"rain"},{closed:"pan",target:"pain"},{closed:"man",target:"main"},{closed:"mad",target:"maid"},{closed:"pad",target:"paid"}],
  contrastiveLine2: ["ran","rain","pan","pain","man","main","mad","maid"],
  contrastiveLine3: ["rain","day","wait","play","main","say","paid","stay"],
  sentences: ["Jay made a sail.","The sail was gray.","Jay set the sail in the rain.","Gail came to play.","Jay gave Gail a wave.","They sail and play that day."],
  dictatedWords: ["rain","wait","paid","day","ran","made"],
  dictatedSentences: ["Jay set the sail.","Gail came to play."],
  comprehensionQuestions: [{question:"What did Jay set in the rain?",questionType:"literal"},{question:"What was the weather like that day?",questionType:"inference"},{question:"Tell me what Jay and Gail did, in your own words.",questionType:"retell"},{question:"What would you do on a rainy day?",questionType:"personal_connection"}],
  heartWordsPreviewedThisLesson:["said","was","they"], heartWordsAssumedKnown:["I","a","the","to"],
  vocabulary:["sail","wave"],
  exampleNonwords:["zait","vaid","jaim","blait","slaim","fraik","snaip","draim"],
  mockPassageText:"Jay made a sail. The sail was gray. Jay set the sail in the rain. Gail came to play. Jay gave Gail a wave. They sail and play that day.",
  mockPassageTitle:"Jay's Sail",
},
team_long_e: {
  demonstrationPairs:[{closed:"bed",target:"bead"},{closed:"met",target:"meet"},{closed:"fed",target:"feed"},{closed:"ten",target:"teen"},{closed:"net",target:"neat"}],
  contrastiveLine2:["bed","bead","met","meet","fed","feed","ten","teen"],
  contrastiveLine3:["green","seat","keep","clean","meet","heat","feed","team"],
  sentences:["Jean has a green bean.","Dean can see the page.","Jean and Dean meet at the lake.","Please keep the seat clean.","\"I need a treat,\" said Jean.","They eat a meal in the heat."],
  dictatedWords:["green","meet","seat","clean","need","made"],
  dictatedSentences:["Jean has a green bean.","Please keep the seat clean."],
  comprehensionQuestions:[{question:"What did Jean give Dean?",questionType:"literal"},{question:"How do you think Dean felt about the treat?",questionType:"inference"},{question:"Tell me what Jean and Dean did, in your own words.",questionType:"retell"},{question:"What treat would you like?",questionType:"personal_connection"}],
  heartWordsPreviewedThisLesson:["said","was","they"], heartWordsAssumedKnown:["I","a","the","to"],
  vocabulary:["bean","treat"],
  exampleNonwords:["zeet","veem","jeet","sneet","bleet","dreet","freep","gleet"],
  mockPassageText:"Jean has a green bean. The bean is in a pot. Dean came to see Jean. \"Can I eat a treat?\" said Dean. Jean gave Dean a treat. They sit and eat. Jean and Dean keep the seat clean. It was a neat treat.",
  mockPassageTitle:"Jean and Dean",
},
team_long_o: {
  demonstrationPairs:[{closed:"cot",target:"coat"},{closed:"got",target:"goat"},{closed:"rod",target:"road"},{closed:"sop",target:"soap"}],
  contrastiveLine2:["cot","coat","got","goat","rod","road","sop","soap"],
  contrastiveLine3:["coat","road","float","goat","boat","toad","roam","coast"],
  sentences:["Joan has a red coat.","The coat is on a boat.","Joan can float the boat.","A toad sat on the road.","\"I like the goat,\" said Joan.","They roam on the coast."],
  dictatedWords:["coat","boat","road","goat","sat","home"],
  dictatedSentences:["Joan has a red coat.","A toad sat on the road."],
  comprehensionQuestions:[{question:"What does Joan have?",questionType:"literal"},{question:"Where do Joan and the toad go?",questionType:"inference"},{question:"Tell me what happened with the boat, in your own words.",questionType:"retell"},{question:"Where would you float a boat?",questionType:"personal_connection"}],
  heartWordsPreviewedThisLesson:["said","was","they"], heartWordsAssumedKnown:["I","a","the","to"],
  vocabulary:["coat","coast"],
  exampleNonwords:["zoat","voap","joat","snoat","bloap","droat","froat","gloap"],
  mockPassageText:"Joan has a red coat. The coat is on a boat. Joan came to float the boat. A toad sat on the road. \"Can I pet the goat?\" said Joan. They roam on the coast. Joan and the toad sit at the home.",
  mockPassageTitle:"Joan's Coat",
},
team_long_i: {
  demonstrationPairs:[{closed:"lit",target:"light"},{closed:"fit",target:"fight"},{closed:"sit",target:"sight"},{closed:"nit",target:"night"}],
  contrastiveLine2:["lit","light","fit","fight","sit","sight","nit","night"],
  contrastiveLine3:["light","night","might","sight","bright","tight","fight","high"],
  sentences:["The light is bright.","Dwight had a tight grip.","Mike sat up at night.","\"I might run,\" said Dwight.","They like the bright light.","Mike will fight the fright."],
  dictatedWords:["light","night","might","sight","ran","like"],
  dictatedSentences:["The light is bright.","Mike sat up at night."],
  comprehensionQuestions:[{question:"What did Dwight have?",questionType:"literal"},{question:"Why might Mike be up at night?",questionType:"inference"},{question:"Tell me what Mike and Dwight did, in your own words.",questionType:"retell"},{question:"What do you see at night?",questionType:"personal_connection"}],
  heartWordsPreviewedThisLesson:["said","was","they"], heartWordsAssumedKnown:["I","a","the","to"],
  vocabulary:["bright","fright"],
  exampleNonwords:["vight","jight","snight","dright","glight","skight","swight","splight"],
  mockPassageText:"The light is bright. Dwight had a tight grip. Mike sat up at night. \"I might run,\" said Dwight. They like the bright light. Mike and Dwight fight the fright at night. It was a bright sight.",
  mockPassageTitle:"A Bright Night",
},
```

## Validation evidence (run against real CMUdict, 135,166 entries, in-repo `data/phonogram/cmudict.json`)
For ALL 4 targets, independently verified in-sandbox:
- **Target words carry the right vowel** (so they classify to the registry team, not exceptions): ai/ay→`EY`, ee/ea→`IY`, oa→`OW`, igh→`AY`. No exception words (said/captain/bread/head) used as targets.
- **Pseudowords (8/target):** all absent from CMUdict AND pronunciation-homophone-safe (no real word shares their sounded-out onset+vowel+coda — the check caught and rejected collisions like zeen≈zine, voat≈vote, tright≈trite).
- **Mock passages fully decodable:** every word is real and composed only of taught patterns; **zero undeclared cross-team contamination** (declared heart-word exemptions like `said` are reported separately and do not count as target evidence); **no repeated trigrams**; no r-controlled / open-syllable-function / inflected-team words.

## Gates (existing Phase-3 stack applies to all 4, PLUS the 2 new)
`classifyPassageWords` decodability = 1.000; `runPassageQualityAudit` (no repeated trigrams); per-pseudoword CMUdict oracle (8, absent, homophone-safe); `LESSON_PHASE3_NO_RCONTROLLED` (clean — none active); Part-3 real-word + pseudoword counts; `LESSON_DAILY_TARGET_NARROW`; the full `auditGeneratedLessonDraft` + spec-conformance loop run over **all 4 targets**; ensureMockApprovedPassage per-target (idempotent, passes quality gate); the hardcoded-content regression guard (no Dave/Jane/cake leakage). PLUS `LESSON_PHASE4_NO_BARE_TEAM_CODES` and `LESSON_PHASE4_PATTERN_IN_TARGET_SET`.

## What Codex must NOT do
1. No engine/matcher/registry changes (foundation is merged & audited).
2. No Phase 3 behavior change — Phase 3 Entry/Mid generation/audit/conformance/seed tests byte-identical (Rule 0).
3. No bare team codes anywhere (use registry codes).
4. No `ow`/`ie`/`oo`, no diphthongs, no Track-B morphology (later PRs).
5. No student-facing route/runtime (separate later work).

## Tests
- Pipeline + spec-conformance loop green over all 4 Phase-4 targets (decodability, quality, pseudoword oracle, counts).
- `LESSON_PHASE4_NO_BARE_TEAM_CODES`: a fixture using bare `ai` → FAIL; registry `team_ai` → PASS.
- `LESSON_PHASE4_PATTERN_IN_TARGET_SET`: a `team_long_a` lesson seeded with an `oa` word/nonword → FAIL; clean → PASS. A cross-team word (e.g. `rain` in `team_long_o`) → FAIL.
- **Heart-word exemption:** a declared heart word (`said`) in a `team_long_o` passage → PASS (allowed because listed in `heartWordsPreviewedThisLesson`/`heartWordsAssumedKnown`), and it does NOT count as a `team_oa` target word. The same word, if NOT declared, → FAILS the cross-team gate.
- Seed asserts each Phase-4 target declares ≥1 registry pattern and each nonword detects to one of them.
- Phase 3 Entry/Mid back-compat suites unchanged.
- `npx prisma validate`, `npx tsc --noEmit`, `npm run test:content-v3`, `npm run content:audit-phase3-nonwords` (+ a Phase-4 nonword audit), `npm run build`.

## Acceptance
4 Phase-4 long-vowel-team targets land as content+seed; all use registry codes (the 2 new gates enforce); every target word + nonword classifies into the declared registry patterns; passages decodable 1.000, quality-clean, cross-team-free; Phase 3 byte-identical; tests green. No engine change, no bare codes, no diphthongs/morphology, no student route.

## Stop — report (for Claude's independent audit)
The new content module + Phase-4 seed + the 2 new gates + content-resolver wiring; proof Phase 3 suites are byte-identical; the per-target pipeline/conformance results; the 2 new gates' negative-test results; the Phase-4 pseudoword audit; `tsc`/`build`. Do NOT add ow/ie/oo, diphthongs, morphology, a reviewer role, or any student-facing route.
