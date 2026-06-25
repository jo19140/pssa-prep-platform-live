# EOY P4 — Passage Package (drama)

**Working title:** The Borrowed Bike
**Category:** A — Literary drama (single script, **four scenes**) · **Length:** **target exactly 1,137 words** (verify at lock with the repo tokenizer). **Genre:** `drama`. **No figure.**
**Status:** **APPROVED / LOCKED** (2026-06-25). Final audit-correction pass applied and verified against the real parser/detector/gates; §9 assertion 4 uses the exported `evaluatePssaTextFeatureIntegrity(passage, p4Items)` wrapper (the private `evaluateDramaFeatureIntegrity` is not importable). Applied this pass: (1) **period-free speaker labels** `MR ALVAREZ:` so all four lines parse as `spoken_line`; (2) **corrected evidence-link contract** — literal drama evidence requires `quotedSpan` + `sceneId` + integer `lineIndex` (+`speaker` for `spoken_line`, none for `stage_direction`), omitting only prose coordinates, and `whole_play_synthesis` carries no literal-location fields (verified against `validateDramaEvidenceLink`); (3) **CAST front-matter block** bound to the `cast_list` feature so the student-facing passage receives the cast and the drama stamina gate passes; script **retuned to hold exactly 1,137** (CAST +18 / scenes −18); (4) **§9 regression assertions** added. Prior revision retained: parser-valid `## SCENE N` headings; real **Scene 4** (`scene_01`–`scene_04`); Sofia-mitten fix; item 25 → `whole_play_synthesis`, AO-6 → the exact `"I jumped to conclusions"` line. **Section:** S1. **Blueprint:** `specs/pssa_g3_eoy_blueprint_finalization.md` (APPROVED/LOCKED).

**Drama structure (mirror merged MOY P4):** `genre:"drama"`; the script text uses **`## SCENE 1` … `## SCENE 4`** headings (parser: `/^#{0,2}\s*SCENE\s+\d+/`) and **plain uppercase `SPEAKER:` lines**. The speaker parser is `/^([A-Z][A-Z\s'-]*):\s*(.+)$/` — its label class is `[A-Z\s'-]` and **contains no period**, so a label like `MR. ALVAREZ:` would fall through to `stage_direction`; every spoken label is therefore written **period-free** (`MAYA:`, `TYLER:`, `MR ALVAREZ:`). Standalone parenthetical lines parse as `stage_direction`. Scenes map to `scene_01`–`scene_04`; a **CAST front-matter block precedes `## SCENE 1`** and is filtered out of `buildPssaDramaLineMap` (it does not shift any scene `lineIndex`).

**Evidence-link contract (verified against `validateDramaEvidenceLink` in `scripts/audit/pssa-audit-detectors.ts`):** literal drama evidence (`spoken_line` / `stage_direction`) requires **`quotedSpan`** (must appear in the passage, normalized) **+ `sceneId`** (`/^scene_\d{2}$/`) **+ integer `lineIndex`**, with **`speaker` required for `spoken_line`** and **`speaker` omitted for `stage_direction`**. It **omits prose coordinates** (`paragraphIndex` / `sentenceIndex` / `startChar` / `endChar`) but it **does not omit `quotedSpan`**. The message item uses **`whole_play_synthesis`**, which carries **no literal-location fields at all** (no `quotedSpan` / `sceneId` / `lineIndex` / `sectionId` / char offsets — the detector rejects any of them). **`lineIndex` values are derived from `buildPssaDramaLineMap` after the final 1,137-word text — never hand-counted.** Subject to the **drama stamina gates** (the drama branch of the exported `evaluatePssaTextFeatureIntegrity`; and the drama branch of `evaluatePssaPassageStaminaMetadata`, which requires `featureRows.length > 0` — see §7.2).

**Hosts (per the locked EOY EC table):**
- **Operational (6 items / 7 pts):** A-K.1.1.1 MCQ (explicit), A-K.1.1.3 MCQ (sequence), A-V.4.1.1 MCQ (word meaning), A-V.4.1.2 MCQ (figurative), A-K.1.1.2 MCQ (theme/message, `whole_play_synthesis`), **A-K.1.1.3 EBSR (motivation→action, 2pt)**.
- **Analytics-only (S1):** **AO-6 = A-V.4.1.2 MCQ (figurative)** — the **documented drama deepen exception** (the single allowed deepen; POV is invalid on a play and drama-valid literary ECs are limited). 7 items / 8 pts on P4.

> Message (inferred, A-K.1.1.2): **ask / communicate before you jump to conclusions.** Distinct from P2's confession arc — P4 is about **wrongly assuming someone else made a mistake, then learning to listen.** Original fiction → `factCheckRequired:false`.

---

## 1. Topic & cast

A neighborhood drama. **Maya** lends her hard-saved bike to her friend **Tyler**; it comes back scratched; Maya **assumes Tyler was careless and confronts him without listening**; neighbor **Mr Alvarez** reveals Tyler scratched it swerving to miss his small daughter Sofia in the street; Maya learns to ask before assuming. Title: **The Borrowed Bike.**

**Cast (`cast_list`):** MAYA (a third-grader who owns the bike) · TYLER (Maya's friend) · MR ALVAREZ (a neighbor). *(Sofia is referred to but never appears onstage.)*

---

## 2. Script (parser-valid; tune to exactly 1,137 at lock)

CAST OF CHARACTERS
MAYA, a third-grader who owns the bike
TYLER, her friend
MR ALVAREZ, a neighbor

## SCENE 1

(A driveway on a bright Saturday morning. MAYA is wiping down a blue bicycle with a soft cloth, polishing the frame until it shines. TYLER hurries up the sidewalk, out of breath.)

TYLER: Maya! Am I glad I found you. My mom needs her library books back by noon or she owes a big fine, and my bike has a flat tire.

MAYA: (still polishing) That stinks. The library is all the way across town.

TYLER: I know. (He looks at her bike.) Could I maybe borrow yours? Just for an hour? I'll be careful, I promise.

MAYA: (gripping the handlebars) This bike is special, Tyler. I saved up two whole summers of chore money for it. It's the nicest thing I own.

TYLER: I'll guard it like it's made of gold. One hour. You'll barely know it was gone.

MAYA: (she does not let go yet) You have to walk the bumpy part on Oak Street, okay? And no jumping the curb by the park. And you bring it straight back.

TYLER: Walk the bumpy part. No curb jumping. Straight back. Got it.

MAYA: (after a long pause, she lets go of the handlebars) Okay. One hour. Please.

TYLER: (climbing on, grinning) You're the best, Maya. I owe you a hundred favors!

(He pedals off down the street. MAYA stays at the end of the driveway, watching until he is out of sight, half proud that she helped and half worried about her bike.)

## SCENE 2

(The same driveway, an hour and a half later. MAYA paces back and forth. At last TYLER comes up the sidewalk slowly, walking the bike instead of riding it. A long silver scratch runs down the side of the blue frame.)

MAYA: (rushing over) Finally! You said one hour, Tyler, and it's been way more than — (She stops, staring at the frame, and her face changes.) Wait. What is that? Is that a scratch? On my bike?

TYLER: Maya, I can explain. On the way back, something happened on Oak Street and I had to —

MAYA: (her words coming out cold as ice) You said you'd guard it like gold. I knew I shouldn't have let you take it.

TYLER: Please, just listen for one second. There was a —

MAYA: You were probably showing off, doing wheelies, not even looking.

TYLER: That is not what happened. If you would just let me finish —

MAYA: (turning away, blinking hard) I don't want to hear it. Just go home, Tyler.

TYLER: (after a long, hurt pause) Fine. (He sets the bike down gently against the garage and walks away, his shoulders low.)

(MAYA kneels by the bike and runs her thumb along the scratch, her anger and hurt all tangled together. She does not notice Tyler look back once before he turns the corner.)

## SCENE 3

(A little later. MAYA is still kneeling by the bike when MR ALVAREZ comes down the sidewalk, holding a small purple mitten and studying each house.)

MR ALVAREZ: Excuse me — is this your bike? The blue one with the new scratch?

MAYA: (standing) It's mine, but a friend borrowed it today. Why?

MR ALVAREZ: I've searched the whole block for the boy who was riding it. I owe him a big thank-you. (He holds up the little mitten.) This belongs to my daughter, Sofia. She is only four.

MAYA: (confused) A thank-you? For what?

MR ALVAREZ: Sofia chased her ball into the street on Oak, right in front of your friend's bike. He could have hit her. Instead he turned the bike as hard as he could and crashed into the curb to miss her. He swerved so fast that he scraped the whole side. But he kept my Sofia safe.

MAYA: (her stomach dropping) He swerved. To miss Sofia. And that is how the bike got scratched.

MR ALVAREZ: He didn't even stop to brag. He made sure Sofia was safe and rode off before I could ask his name. (He shakes his head, amazed.) That was a brave thing to do. When you find him, please tell him the Alvarez family says thank you.

(MR ALVAREZ nods kindly and continues down the block. MAYA stands frozen. The scratch on the bike suddenly looks completely different than it did a minute ago.)

MAYA: (quietly, to herself) He tried to tell me. And I never let him say a single word.

(She drops the cloth and runs down the sidewalk.)

## SCENE 4

(In front of TYLER's house. TYLER sits on the front steps, slowly pulling a blade of grass apart. MAYA runs up and stops, out of breath.)

MAYA: Tyler. I am so sorry. Mr Alvarez just found me. He told me about Sofia, and the ball, and the curb. You scratched my bike saving a little kid, and I yelled at you for it.

TYLER: (not looking up at first) I tried to tell you. Three different times. You wouldn't let me get one word out.

MAYA: I know you did.

TYLER: (finally looking at her) That part hurt worse than the bike, Maya. You decided I was careless before you asked me anything. You looked at me like I'd wreck your bike on purpose.

MAYA: (sitting down beside him on the step) You're right. I saw the scratch, and my brain filled in the rest of the story all by itself. I jumped to conclusions.

TYLER: (after a moment) I really did try to be careful. I walked the bumpy part and stayed far from that curb.

MAYA: (listening, not interrupting) Tell me the whole thing. This time I'll just listen.

TYLER: (taking a slow breath) Sofia ran out so fast I didn't even think — I just turned the wheel. The bike went one way and I went the other, and we both met the curb. (He shows a scrape on his elbow.) I'm okay. The bike got the worst of it.

MAYA: (looking at his elbow) You got hurt too. And I never asked if you were all right.

TYLER: It's only a scrape.

MAYA: It still counts. (beat) This bike matters to me — you know that. But you stopping to keep a little kid safe matters a whole lot more. A scratch can be fixed: my uncle has touch-up paint, or we could tape a stripe over it and call it a racing stripe.

TYLER: (a small smile) A racing stripe is kind of cool.

MAYA: (smiling back) Next time, you get to finish your sentence.

TYLER: Deal. (beat) So… do I still owe you a hundred favors?

MAYA: (grinning) Ninety-nine. Saving Sofia covers one of them.

(They both laugh. The afternoon light is warm and easy. END.)

---

## 3. Source & fact-check notes

**Original platform-authored fiction** — no real people, places, or claims. `factCheckRequired:false`; **no `factCheckNotesJson`** (like P2). No undefined Tier-3 terms.

## 4. Structure / motivation map (drives A-K.1.1.3)

Four-scene `drama` (`scene_01` lend → `scene_02` scratch + confrontation → `scene_03` reveal → `scene_04` listen + repair). Arc:
1. **Setup (`scene_01`):** the bike matters to Maya (saved two summers of chore money — A-K.1.1.1 explicit); she lends it warily with rules.
2. **Inciting event (`scene_02`):** the bike returns scratched.
3. **Motivation → action (`scene_02`, drives #22 + #26):** Maya **assumes Tyler was careless / showing off** (motivation) → she **confronts him and refuses to listen, sending him home** (action).
4. **Reveal (`scene_03`):** Mr Alvarez explains Tyler **swerved to miss Sofia** and scraped the bike — a brave act, not carelessness.
5. **Listen + repair (`scene_04`, drives #25):** Tyler names the **hurt** (she decided before asking); Maya **listens to the whole story without interrupting**, admits she **jumped to conclusions**, asks if Tyler is hurt, and they **plan to fix the scratch** (touch-up paint / a "racing stripe"). Message stays **inferred** — concrete close "Next time, you get to finish your sentence," **no stated maxim**.

## 5. Qualitative complexity review

Grade-3 drama: short spoken lines + stage directions; one clear four-scene arc; feelings shown through dialogue and action. Length comes from the scene structure and the listening/repair beats, not denser syntax. Meets Grade-3 vocabulary/syntax at the released drama length.

## 6. Vocabulary-load review (A-V.4.1.2 ×2 distinct figurative; A-V.4.1.1 literal)

- **A-V.4.1.1 (literal, item 23):** **"swerved"** — "he turned that bike as hard as he could… He swerved so fast that he scraped the whole side" (`scene_03`); context (turning sharply to avoid Sofia) supports *turned suddenly aside*.
- **A-V.4.1.2 #1 (figurative, item 24):** **"cold as ice"** — Maya's "words coming out cold as ice" (`scene_02`) = unkind/angry, not literally cold.
- **A-V.4.1.2 #2 (figurative, AO-6 — deepen):** **"I jumped to conclusions"** (`scene_04`, Maya's line) = decided without the facts (not a literal jump). Distinct phrase from "cold as ice"; **this exact spoken line is reserved to AO-6 only.**

## 7. EC support + reserved-evidence table (all 7 P4 items — distinct primary evidence)

**Construct notes:** the two A-V.4.1.2 items use **distinct figurative phrases** ("cold as ice" #24 vs "jumped to conclusions" AO-6, the latter reserved to AO-6 alone). #22 (A-K.1.1.3 MCQ) = the **order of events** across the four scenes; #26 (A-K.1.1.3 EBSR) = the **motivation→action** link. **#25 (A-K.1.1.2) is a `whole_play_synthesis` message item** — supported by the whole arc (the conflict, Tyler's hurt, Maya's apology, her changed behavior), **not** a single quoted maxim.

| # | Item | EC | Type | Reserved primary evidence (scene) |
|---|---|---|---|---|
| 21 | op | A-K.1.1.1 | MCQ | Explicit: **why the bike matters** — "I saved up two whole summers of chore money for it… the nicest thing I own" (`scene_01`). |
| 22 | op | A-K.1.1.3 | MCQ | **Sequence**: the order of the play's events across the four scenes (lend → scratch/confront → reveal → apologize). |
| 23 | op | A-V.4.1.1 | MCQ | Word meaning: **"swerved"** = turned suddenly aside (`scene_03`). |
| 24 | op | A-V.4.1.2 | MCQ | Figurative: **"cold as ice"** = angry/unkind (`scene_02`). |
| 25 | op | A-K.1.1.2 | MCQ | **Theme/message (inferred)** — `whole_play_synthesis`: *ask / listen before you jump to conclusions* (whole arc: conflict + hurt + apology + changed behavior). |
| 26 | op | A-K.1.1.3 | **EBSR (motivation→action, 2pt)** | Maya's **assumed-carelessness motivation → confront/refuse-to-listen action** — §7.1, two `scene_02` spoken lines. |
| AO-6 | analytics | A-V.4.1.2 | MCQ | Figurative ≠ #24: **"I jumped to conclusions"** (`scene_04`, reserved to AO-6) = decided without the facts. |

(EC repeats within P4: A-K.1.1.3 ×2 [#22 + #26, distinct facets], A-V.4.1.2 ×2 [#24 + AO-6, distinct phrases, AO-6's line reserved]; A-K.1.1.1/A-V.4.1.1/A-K.1.1.2 singletons. AO-6 is the **one documented deepen exception**.)

**Evidence-coordinate contract for the table above.** Every `spoken_line` row carries **`quotedSpan` (exact substring) + `sceneId` + integer `lineIndex` + `speaker`**; every `stage_direction` row carries `quotedSpan` + `sceneId` + `lineIndex` and **omits `speaker`**; #25 uses `whole_play_synthesis` with **no** literal-location fields. Specific pins:
- **#23 (A-V.4.1.1, "swerved")** resolves to **MR ALVAREZ's `scene_03` line** — `quotedSpan:"He swerved so fast that he scraped the whole side."`, `speaker:"MR ALVAREZ"`, `sceneId:"scene_03"` (not Maya's "He swerved. To miss Sofia." echo).
- **#24 (A-V.4.1.2, "cold as ice")** → MAYA `scene_02`, `quotedSpan` containing "cold as ice", `speaker:"MAYA"`.
- **#21 (A-K.1.1.1)** → MAYA `scene_01`, `quotedSpan:"I saved up two whole summers of chore money for it."`, `speaker:"MAYA"`.
- **AO-6 (A-V.4.1.2)** → MAYA `scene_04`, `quotedSpan:"I jumped to conclusions."`, `speaker:"MAYA"` (line reserved to AO-6).

### 7.1 Pinned EBSR shape (item 26 — motivation→action)

**Item 26 — A-K.1.1.3 EBSR**, single-text drama. Part A (single-best, 1 logical pt) + Part B (`requiredSelectionCount:2`, two correct **`spoken_line`** selections), `scoringJson.totalPoints:2`. Each Part-B drama evidence link carries **`quotedSpan`** (the exact `scene_02` MAYA line) **+ `sceneId:"scene_02"` + integer `lineIndex` + `speaker:"MAYA"`**; it omits `paragraphIndex`/`sentenceIndex`/char-offsets but **not** `quotedSpan`. (`lineIndex` from `buildPssaDramaLineMap` on the final text.)
- **Part A:** *"Why does Maya tell Tyler to go home before he can explain?"* → **Correct:** "She has already decided he scratched the bike by being careless, so she will not listen."
- **Part B (select 2 — the two `scene_02` MAYA lines, preserved verbatim):** (i) "You were probably showing off, doing wheelies, not even looking." (assumed-carelessness motivation); (ii) "I don't want to hear it. Just go home, Tyler." (the action). Plausible-wrong: a `scene_01` lending line + a `scene_04` apology line (different motivation/time).

The two Part-B lines are distinct from the MCQ anchors (#21 chore-money, #23 swerved, #24 cold-as-ice, #25 whole-play message, AO-6 jumped-to-conclusions).

### 7.2 Drama features + coordinates (pin AFTER the final 1,137-word text)

**Why features are mandatory here (MOY-gap note):** the merged MOY P4 ships `textFeaturesJson: []`, but its test **never calls `evaluatePssaPassageStaminaMetadata` on the drama passage**, so that gate was never exercised against a drama — an empty feature set is *not* a precedent that passes. On the real gate, `isDramaGenre` → the drama branch requires `featureRows(passage).length > 0` (`scripts/content/lib/pssa-stamina-gates.ts`). EOY P4 therefore **carries real features and asserts the gate explicitly** (see §9).

At authoring, `textFeaturesJson` carries:

- **one `cast_list`** whose **`featureText` is the exact CAST front-matter block** (lines `CAST OF CHARACTERS` … `MR ALVAREZ, a neighbor`) — a verbatim substring of `passage.text`, so the student actually sees the cast and the drama branch of `evaluatePssaTextFeatureIntegrity` (`if ("featureText" in feature) … passage.text.includes(featureText)`) passes;
- **four `scene_marker`** features, `sectionId` = `scene_01`–`scene_04` (each in `buildPssaStaminaSectionMap`'s scene-id set), **no `featureText`** (the integrity check only validates `featureText` when the key is present);
- (optional) **selected `stage_direction`** features whose `featureText`, if present, are **exact substrings** of the script.

The drama branch of `evaluatePssaTextFeatureIntegrity` (internally the private helper `evaluateDramaFeatureIntegrity` — **not exported, so never import it directly**) requires every feature type ∈ {`cast_list`, `scene_marker`, `stage_direction`} and every present `featureText` to be an exact `passage.text` substring; the drama branch of `evaluatePssaPassageStaminaMetadata` then passes on `featureRows.length > 0`. Note `evaluatePssaTextFeatureIntegrity` returns `"SKIP"` when `featureRows` is empty, so the cast/scene features are what make it return `"PASS"`. **Every evidence `lineIndex` is computed from `buildPssaDramaLineMap(passage)` on the final script — not hand-counted.**

## 8. Non-overlap check

- **vs MOY:** MOY's drama "The Last Rehearsal" (school play, stage-fright/teamwork) — same *format*, different topic/characters/message.
- **vs other EOY:** P1 crayons (info), P2 broken-vase (narrative, **confession/owning a mistake**), P3 going-to-school (paired info). **P4 ≠ P2:** P2 = a child owning a mistake *they* made; P4 = a child **wrongly assuming someone else** made a mistake and learning to ask first.

## 9. Pinned regression assertions (drama parser + gate)

The P4 test wiring (in `scripts/test-pssa-content.ts`) must assert, against `buildPssaDramaLineMap(eoyP4Passage)` on the **final** text:

1. **Every colon-labeled character line parses as `spoken_line`** — i.e. no intended speaker line is misclassified as `stage_direction` (catches any stray period or lowercase label). Concretely: each `MAYA:` / `TYLER:` / `MR ALVAREZ:` line maps to `evidenceKind:"spoken_line"`.
2. **The set of parsed speakers is exactly `{"MAYA","TYLER","MR ALVAREZ"}`** — no `"MR. ALVAREZ"`, no empty/undefined speaker among spoken lines.
3. **Item 23's `swerved` evidence resolves to MR ALVAREZ's `scene_03` line** — the line-map entry found via `row.text.includes("He swerved so fast that he scraped the whole side.")` (the line-map `text` includes the `MR ALVAREZ:` speaker prefix, so match on `includes`, not equality) has `sceneId:"scene_03"`, `speaker:"MR ALVAREZ"`, `evidenceKind:"spoken_line"`.
4. **The two exported stamina gates pass:**

   ```ts
   evaluatePssaPassageStaminaMetadata(eoyP4Passage) === "PASS"
   evaluatePssaTextFeatureIntegrity(eoyP4Passage, p4Items) === "PASS"
   ```

   These explicitly exercise the drama branch the MOY P4 suite skipped. `evaluatePssaTextFeatureIntegrity` is the exported wrapper whose **drama branch** runs the integrity check (the private `evaluateDramaFeatureIntegrity` is **not** importable); it returns `"PASS"` only because the passage carries the `cast_list` + four `scene_marker` features (`featureRows.length > 0`, `cast_list.featureText` an exact `passage.text` substring) — with no features it would `"SKIP"`, and `evaluatePssaPassageStaminaMetadata` would `"FAIL"`.
5. **Word count is exactly 1,137** (CAST front matter + four scenes) via the repo tokenizer.

---

**For review — no items yet.** On sign-off: confirm the script is exactly **1,137** words, lock evidence + the item-26 EBSR lines, then the P4 item-authoring spec (6 operational + AO-6); then Codex author → independent audit → pinned merge (the last EOY passage). **No figure; `factCheckRequired:false`; drama features per §7.2.**
