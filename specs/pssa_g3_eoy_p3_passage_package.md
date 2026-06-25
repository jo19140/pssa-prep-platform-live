# EOY P3 — Passage Package (paired informational)

**Working title:** Going to School: Then & Now (Text 1 **"School Long Ago"**, Text 2 **"School Today"**)
**Category:** B — Paired informational (2 raw texts) · **Length:** **850 words combined (Text 1 = 425, Text 2 = 425)** — verify with the repo tokenizer at lock. **No figure.**
**Status:** **APPROVED / LOCKED (2026-06-24)** — **850 words verified (425 / 425)**; 16 source-verified `factCheckNotesJson` records (8 LoC / 8 NCES, both URLs fetched 2026-06-24 + verbatim-supported); 6 EBSR correct spans verbatim, pairwise distinct, and sufficient for their Part A; paired-group contract + item-construct separation (main-idea #8 vs viewpoint #9; materials-difference #12 vs shared-purpose #13; whole-passage viewpoint items #9/AO-1 vs dedicated purpose spans for #13) audited. **Section:** S2. **Blueprint:** `specs/pssa_g3_eoy_blueprint_finalization.md` (APPROVED/LOCKED).

**Group structure (mirror MOY P3 paired contract exactly):**
- **Each member passage** (`passage_1` = School Long Ago, `passage_2` = School Today): `passageType:"informational"`, `genre:"informational"`, **no member `staminaBand`** (a paired member is not scored as a standalone released-length passage — it SKIPs the single-passage stamina-metadata gate), `factCheckRequired:true` + its `factCheckNotesJson` subset, `provenanceJson` with `passageSlot`.
- **The group** `pssa_pg_g3_eoy_p3_school_paired` owns `groupType:"paired_informational"`, `genre:"paired_informational"`, **`staminaBand:"released_length"`**, the two `paired_member` features (`{type:"paired_member", slot, title}`), each member's `passageContentHashSnapshot`, and the group `contentHash` (from the member hashes).
- Cross-text evidence links carry `passageSlot` (and `passageSlots` for cross-text items).

**Hosts (per the locked EOY EC table):**
- **Operational (6 items / 7 pts):** B-K.1.1.2 MCQ (main idea), B-C.2.1.1 MCQ (author viewpoint), B-V.4.1.2 MCQ (word relationship), B-K.1.1.3 MCQ (sourced historical sequence), B-C.3.1.2 MCQ (materials difference), **B-C.3.1.2 EBSR cross-text (2pt, shared-purpose similarity)**.
- **Analytics-only (S2):** **AO-1 = B-C.2.1.1 MCQ**, **AO-4 = B-V.4.1.2 MCQ**, **AO-7 = B-K.1.1.1 EBSR (2pt)**, **AO-8 = B-C.3.1.1 EBSR (2pt)**. 10 items / 13 pts on P3.

---

## 1. Topic & titles

A paired set comparing American schooling long ago and today. **Text 1 "School Long Ago"** describes **rural** one-room schools and their limits. **Text 2 "School Today"** describes modern tools and their place in learning. Same topic, two angles across time → genuine compare/contrast.

---

## 2. Passages (exactly 425 / 425; all factual claims source-traced — §3; verify member counts at lock)

### Text 1 — School Long Ago  *(`passage_1`)*

Long ago, going to school in the United States did not look the same everywhere. In the countryside, many rural children learned in a one-room schoolhouse. In these small country schools, children of several grades studied together in a single room, taught by just one teacher. In the growing cities, schools were already larger, and students worked in separate classrooms by grade. So even in the past, schools were not all the same, and a child's school depended a good deal on exactly where that child lived.

A one-room school was a simple place with few supplies. Students today would be surprised at how little there was. There were fewer books and supplies for students to use, and instead of paper, pencils, and computers, a child in the early twentieth century probably had only a slate and a piece of chalk. A slate was a small board that a student could write on and then wipe clean to use again. When one lesson was finished, the student wiped the slate and started the next. Much of the learning happened by memorizing and reciting, repeating facts out loud until they were known well. Discipline in these schools could be rather strict.

Country schools also followed the seasons. In farm areas, the school year was often shorter than it is today, because young people were needed to work on the farm. These schools did not have a lunch program. Students carried their own food from home, often in a metal pail. This need for farm work, not just the calendar, often decided how long a school year would be.

Schools like these did not stay the same forever. Over time, public schools grew more and more common across the country. States began to pass laws requiring children to attend, and by 1920 every state required children ages eight to fourteen to go to school for at least part of the year. Little by little, school attendance became expected for more children across the country.

A one-room school had real limits. One teacher had to divide a single day among many ages and many levels, so each child received only a small share of the teacher's time. Yet these small schools did something powerful: they gathered children of several grades under one roof to learn together. Even with so little, these country schools existed for one purpose: to help children learn. For the families they served, the country schoolhouse was the **heart** of learning, a place where children of several grades learned side by side.

### Text 2 — School Today  *(`passage_2`)*

Walk into a school today, and one of the biggest changes you will notice is the set of tools that students use to learn. Many of these tools did not exist at all when one-room schoolhouses were common.

In many schools now, each student has a computer or a tablet of their own. In some schools, students may even take a school computer home. Along with printed books, many schools use online textbooks that students can read on a screen. With tools like these, a student does not always have to wait for the whole class to move at the same speed. In a national survey of public schools, some schools reported that technology can help children learn at their own pace, moving ahead when a subject feels easy and slowing down when a subject feels hard. A student who already understands a lesson need not wait for the others, while a student who needs more time can keep working.

For many students, these tools can act like a **window**, opening a view to new things to learn. Some schools reported that technology helped students become more independent, taking charge of their own learning. Other schools said it helped students learn more actively, doing and trying instead of only listening. And some reported that it helped students work together with classmates on a shared task. In these ways, the right tools can give students more choices about how they learn.

But a computer is only a tool. The same report that describes these new devices is careful to remind readers that technology by itself does not make a better education. Screens and programs cannot teach all on their own. Teachers still plan the lessons, explain the hard ideas, and help each student who is stuck. The report even notes that teachers themselves need time and training to use new technology well, so that the tools truly help. A tablet in every hand is not enough if no one shows students how to use it to learn. Even the best new device cannot replace a caring, well-trained teacher.

So school today and school long ago are not the same. The slate and chalk of the old country schools have become a tablet and a screen, and a few shared books have become many lessons on a screen. Yet beneath all of the new tools, school exists so that children can learn and grow, the same goal the old country schoolhouse always had. The tools keep changing, but the reason for school stays the same.

---

## 3. Source & fact-check notes (both members `factCheckRequired:true`)

Real, HTTPS, government sources; **both URLs fetched 2026-06-24 and every record is verbatim-supported.** Claims hedged ("many rural children," "many schools," "some schools reported"); **the Grade-3 student text contains no statistics** (precise figures live only in the records). **Every load-bearing factual claim and item anchor maps to a record below**; figurative ("heart," "window"), definitional/purpose statements, rhetorical comparisons, and logical inferences are not empirical claims and carry no record.

**Text 1 (`passage_1`)** → **Library of Congress**, "Children's Lives at the Turn of the Twentieth Century" (8 records):
`t1-one-room-all-ages` (grades together, one teacher) · `t1-cities-grade-separation` (urban schools larger, grade-separated) · `t1-slate-chalk` (slate and chalk; fewer supplies) · `t1-rote-memorization` · `t1-strict-discipline` ("Discipline could be rather strict") · `t1-shorter-rural-year` (farm work) · `t1-lunch-pail` (no lunch program; metal pail) · `t1-attendance-1920` (by 1920 all states **required** ages 8–14, part of the year).

**Text 2 (`passage_2`)** → **NCES (U.S. Dept. of Education)**, "Use of Educational Technology for Instruction in Public Schools: 2019–20" (8 records):
`t2-device-per-student` (computer per student; take-home) · `t2-online-textbooks` (interactive/online textbooks) · `t2-learn-at-own-pace` · `t2-independent` ("more independent and self-directed") · `t2-active-learning` ("learn more actively") · `t2-collaborate` ("learn collaboratively with peers") · `t2-tech-not-enough` (technology alone insufficient; teachers central) · `t2-teacher-training` (teachers need time/training/support).

**Literal `factCheckNotesJson` (paste verbatim — 16 source-verified records; author splits by `passageSlot`: 8 → `passage_1`, 8 → `passage_2`):**

```json
[
  {"claimId":"t1-one-room-all-ages","claim":"In rural one-room schoolhouses, the grades studied together in a single room and were taught by one teacher.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-cities-grade-separation","claim":"In urban areas, schools were larger and students worked in separate classrooms according to their grade level.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-slate-chalk","claim":"Students in the early twentieth century probably had only a slate and chalk rather than paper and other modern school supplies.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-rote-memorization","claim":"In early one-room schools, learning was frequently by rote memorization.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-strict-discipline","claim":"Discipline in early one-room schools could be rather strict.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-shorter-rural-year","claim":"In rural areas the school year was shorter because young people were needed to work on the farm.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-lunch-pail","claim":"There was no school lunch program; students carried their lunch to school, often in a metal pail.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t1-attendance-1920","claim":"By 1920 all states required students aged 8 to 14 to attend school for at least part of the year; public schools had grown more numerous and states began requiring attendance.","sourceTitle":"Children's Lives at the Turn of the Twentieth Century","organization":"Library of Congress","sourceUrl":"https://www.loc.gov/classroom-materials/childrens-lives-at-the-turn-of-the-twentieth-century/","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_1"},
  {"claimId":"t2-device-per-student","claim":"Many public schools provide a computer for each student (45 percent one-per-student, plus 37 percent in some grades), and some let students take a school computer home (15 percent in all grades).","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-online-textbooks","claim":"About half of public schools used interactive (online) textbooks for teaching and learning.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-learn-at-own-pace","claim":"Schools reported that classroom technology helped students learn at their own pace.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-independent","claim":"Schools reported that the way technology is used helped students be more independent and self-directed.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-active-learning","claim":"Schools reported that technology helped students learn more actively.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-collaborate","claim":"Schools reported that technology helped students learn collaboratively with peers.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-tech-not-enough","claim":"Technology alone does not guarantee a better education; schools and teachers play a central role in using technology to strengthen teaching and learning.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"},
  {"claimId":"t2-teacher-training","claim":"Teachers need time, training, and support to use technology well for teaching and learning; lack of time and training are reported challenges.","sourceTitle":"Use of Educational Technology for Instruction in Public Schools: 2019-20","organization":"National Center for Education Statistics, U.S. Department of Education","sourceUrl":"https://nces.ed.gov/pubs2021/2021017Summary.pdf","claimSupported":true,"dateAccessed":"2026-06-24","passageSlot":"passage_2"}
]
```

Both URLs verified 2026-06-24 to support every claim.

## 4. Structure / compare-contrast map

Two short third-person informational members, no `###` headings. Contrast axis = time.
- **Text 1 main idea (#8):** rural schools long ago often had one teacher, several grades, and limited supplies, while public schooling slowly became more common — a *factual summary*.
- **Text 1 viewpoint (#9, whole-passage):** the author presents one-room schools as **limited but still valuable** because they brought children together to learn — an *evaluative stance* (distinct from #8).
- **Text 2 viewpoint (AO-1, whole-passage):** modern technology **helps** (independence, active/collaborative learning) **but teachers remain central** and tech alone is not enough.
- **Materials *difference* (#12, MCQ):** slate & chalk (then) ↔ online textbooks on a screen (now). Both sourced.
- **Shared *purpose* (#13, cross-text EBSR):** both schools exist to help children learn — **dedicated** purpose sentence in each text (not used as the **primary** evidence for #9 or AO-1; those viewpoint items rely on the broader limited-but-valuable and tools-help-but-teachers-central stances).
- **Sourced historical sequence (#11):** public schools grew more common → states began requiring attendance → by 1920 every state required ages 8–14.

## 5. Qualitative complexity review

Grade-3 paired informational: simple/compound sentences; one comparison structure; domain words context-supported (*slate* is defined in-text, *online textbook, attendance*). 850 combined supports paired released-length seat-time. Two anchored figurative phrases (§6).

## 6. Vocabulary-load review (B-V.4.1.2 ×2 — nonliteral, distinct; APPROVED targets)

- **Item 10 (Text 1):** **"heart"** = central/most important place ("the country schoolhouse was the **heart** of learning") — figurative, not a sourced claim.
- **AO-4 (Text 2):** **"window"** = a way to see/reach new things ("these tools can act like a **window**") — distinct nonliteral relationship, other member.

## 7. EC support + reserved-evidence table (all 10 P3 items — distinct primary evidence)

**Construct notes:**
- **#8 (main idea) vs #9 (viewpoint)** — both `whole_passage_synthesis` on `passage_1`, but distinct constructs: **#8 = the factual gist** (one teacher / several grades / few supplies; schooling grew more common); **#9 = the author's evaluative stance** (limited but valuable for bringing children together). They cannot collapse into one another.
- **#12 vs #13 (both B-C.3.1.2)** — #12 = a **materials difference** (MCQ); #13 = the **shared-purpose** similarity (cross-text EBSR), with its **own dedicated purpose sentence per text** — not used as the **primary** evidence for any other item.
- **AO-1** focuses on *tools-help-but-teachers-central* (not the shared-purpose sentence reserved to #13).

| # | Item | EC | Type | Slot(s) | Reserved primary evidence |
|---|---|---|---|---|---|
| 8 | op | B-K.1.1.2 | MCQ | p1 | **Main idea (factual gist)** — `whole_passage_synthesis` (`passage_1`). |
| 9 | op | B-C.2.1.1 | MCQ | p1 | **Author viewpoint (limited-but-valuable)** — `whole_passage_synthesis` (`passage_1`). |
| 10 | op | B-V.4.1.2 | MCQ | p1 | Word relationship: **"heart"** = central place. |
| 11 | op | B-K.1.1.3 | MCQ | p1 | **Sourced sequence**: schools grew more common → states required attendance → by 1920 ages 8–14. |
| 12 | op | B-C.3.1.2 | MCQ | p1+p2 | **Materials difference**: p1 `"probably had only a slate and a piece of chalk"` vs p2 `"many schools use online textbooks that students can read on a screen"`. |
| 13 | op | B-C.3.1.2 | **EBSR cross-text** | p1+p2 | **Shared purpose** — Part A + dedicated purpose span per text (§7.1). |
| AO-1 | analytics | B-C.2.1.1 | MCQ | p2 | **Viewpoint ≠ #9** — `whole_passage_synthesis` (`passage_2`): tools help **but** teachers/training remain central. |
| AO-4 | analytics | B-V.4.1.2 | MCQ | p2 | Word relationship ≠ #10: **"window"**. |
| AO-7 | analytics | B-K.1.1.1 | **EBSR** | p1 | **Explicit (lunch)** — Part A + two distinct `passage_1` sentences (§7.1). |
| AO-8 | analytics | B-C.3.1.1 | **EBSR** | p2 | **Cause/effect (devices → own pace)** — Part A + two `passage_2` spans (§7.1). |

(EC repeats within P3: B-C.2.1.1 ×2 [#9 + AO-1], B-C.3.1.2 ×2 [#12 + #13], B-V.4.1.2 ×2 [#10 + AO-4].)

### 7.1 Pinned EBSR shapes (items 13, AO-7, AO-8 — exact Part A; exactly two Part B correct spans; no shared span; no "and/or")

The **six** correct Part-B spans are pairwise distinct and distinct from all MCQ anchors; each verbatim-supports its Part A.

**Item 13 — B-C.3.1.2 (cross-text, shared purpose), `passageSlots:["passage_1","passage_2"]`:**
- **Part A:** *"What important purpose do both texts show that schools share?"* → **Correct:** "Both show that schools exist to help children learn."
- **Part B (select 2):** **Correct = exactly** — (p1) `"these country schools existed for one purpose: to help children learn"`; (p2) `"school exists so that children can learn and grow"`. Plausible-wrong: a p1 slate line + a p2 device line (tools, not purpose).

**AO-7 — B-K.1.1.1 (explicit), all `passage_1`:**
- **Part A:** *"What does Text 1 say about lunch at the country schools?"* → **Correct:** "The schools had no lunch program, so children brought food from home."
- **Part B (select 2):** **Correct = exactly these two distinct sentences** — (p1) `"These schools did not have a lunch program."`; (p1) `"Students carried their own food from home, often in a metal pail."`. Plausible-wrong: a slate line + a memorizing line.

**AO-8 — B-C.3.1.1 (cause/effect), all `passage_2`:**
- **Part A:** *"Why can students today often learn at their own pace?"* → **Correct:** "In many schools, students can use their own devices, which can help them learn at their own pace."
- **Part B (select 2):** **Correct = exactly** — (p2) `"each student has a computer or a tablet of their own"`; (p2) `"technology can help children learn at their own pace"`. Plausible-wrong: the "window" line + the "teachers still plan the lessons" line.

Every quoted Part-B span is a verbatim substring of its member (verified); none is reused across items 13/AO-7/AO-8 or by the MCQ anchors (#8 gist, #9 viewpoint, #10 heart, #11 sequence, #12 materials, AO-1 viewpoint, AO-4 window).

## 8. Non-overlap check

- **vs MOY P3** (paired informational, mail): same **format** (the locked P3 design) but entirely different topic, vocabulary, and member content.
- **vs other EOY:** P1 crayons (process info), P2 broken-vase (narrative), P4 borrowed-bike (drama). P3 is the only compare/contrast-across-time unit.

---

**LOCKED — no items yet.** Next: the P3 item-authoring spec (6 operational + AO-1/4/7/8), mirroring the audited P2 detector contract (per-choice `evidenceLinks` with zero-based `paragraphIndex`/`sentenceIndex` + `slice(startChar,endChar)===quotedSpan`, `comprehensionKindRationale` for any inference item, leak-free output) plus the paired specifics (member/group structure, `passageSlot` evidence, the three EBSR Part-A/Part-B shapes, the released-length informational fact-check gate). **No figure; both members `factCheckRequired:true`; paired contract per the header.**
