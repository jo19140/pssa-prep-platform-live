# Lesson player — fixes & backlog

**Running list from live testing of the full 8-part a_e lesson (FL-1 + FL-2 + FL-3 on `main`, 2026-06-13).** The lesson plays end-to-end; this is the punch list to make it good. Grouped by type + priority.

## 1. CONTENT / COPY BUGS (kid-facing text is wrong) — high priority, small fixes

- **1a. Part 2 rule wording is awkward.** Current `kidRuleStatement` leads with "the e is quiet — *but* it makes the a say its name," which buries the e's actual job. **Jonathan's (correct, standard) framing:** adding a silent e to a CVC word makes the vowel say its name, and the e is silent. Proposed revision (pending Jonathan's final wording — his call):
  - `kidRuleStatement`: "When we add an e to the end of a word like cap, it makes the a say its name — and the e is silent. Watch: cap turns into cape."
  - `reteachPrompt`: "The e at the end is silent, and it makes the a say its name. Try again: {word}."
  - Small content edit to the a_e entry; flows to Part 2 + Part 3 reteach.
- **1c. Part 2 demonstration pairs are silent decoration → make them select-to-hear + gate the button.** The extra minimal pairs (`at→ate`, `man→mane`, `tap→tape`, `hat→hate`) sit as static chips with no audio/interaction. Fix: **each pair is tappable; tapping plays Harper saying it ("at… ate. The e makes the a say its name.") and marks it explored; "I practiced it" stays DISABLED until the student has selected + heard each example.** This (a) teaches the rule across multiple worked examples (I-do→we-do), and (b) is a pacing/accountability gate — the kid can't just click "I practiced it" and rush past without taking it in. Makes that button honest. Tap-and-hear is gentle/fast (require each once, not punitive repeats). Depth = Jonathan's call.

- **1d. Part 4 (power/heart words): tap each box to hear it individually — not "Hear the words" all at once.** Today "Hear the words" speaks the whole set in one run-on, sentence-like utterance (wrong way to teach heart words). Fix: **each word box is individually tappable → Harper says just that one word, clearly (its OWN utterance, never concatenated)** → "I know these" gates until each has been heard. Same tap-each-item model as Parts 2/3.

### Cross-cutting design principle: "tap each item, hear it alone, prove engagement"
The whole lesson follows ONE interaction pattern: every item (example pair, word line, power word, sentence) is **individually tappable**, each plays/records as its **own clear audio (never concatenated into a sentence)**, and the **advance button gates until the kid has engaged each** — the way a reading specialist won't let a kid race ahead or drill words as a run-on list. Part 1 = read each warm-up word aloud (Harper listens); Part 2 = tap+hear each example; Part 3 = tap each word to read it; Part 4 = tap each word to hear it; **Part 5 = tap each SENTENCE, read it separately (Harper listens/encourages, no score), gate until all read**; Part 7 = same per-unit (sentence/story) read-then-advance; pseudowords = tap+confirm. Gentle, not punitive — tune required reps from real-kid observation. **This is one shared "tappable item" interaction reused across every part** — build it once.
### Cross-cutting design principle: skill rung ≠ age band — DIFFERENTIATION / `presentationProfile` (Jonathan, 2026-06-13→14)
**Decouple the SKILL RUNG from the PRESENTATION.** The skill a student works is set by the **DIAGNOSTIC and does NOT change**; what changes per band is **presentation + engagement**. A learner sits at an age; the band is keyed to the **STUDENT'S age, not the skill's grade level** (a 7-8 band kid may work a K-1 rung). Yohanna is a soon-to-be **7th grader** working the a_e rung — but the live lesson wraps it in 2nd–3rd-grade packaging ("Dave made a cake for Jane"). That mismatch is a **dignity + retention problem, not cosmetic**: the #1 reason older striving readers disengage is that intervention material *feels babyish* → shame → shutdown or click-through-to-escape.

**THREE BANDS DECIDED: K-3 / 4-6 / 7-8.** Harper **ages up** with the band (same character grows older — confirmed; not a separate coach). Architecture: add a **`presentationProfile` dimension separate from the diagnostic-determined daily-target/skill selector.** It changes THREE layers, not just cosmetics:
1. **Cosmetics** — art style, Harper's age/tone/voice, copy register.
2. **Activity format / interaction shape** (the key insight) — K-3 = multisensory game-like activities (drag-to-sort, tap-to-match, trace, color-and-read, chant-repeat); 7-8 = cleaner, tool-like, text-forward rendering of the SAME target. A 7th grader doesn't sort clip-art ducks into a /d/ bin; they get the same phoneme work in an age-respecting wrapper.
3. **Coach persona** — Harper ages up.

- **STAYS fixed across bands:** the diagnostic-assigned skill/target, the structured-literacy method, confidence-gated autonomy, the capture/flywheel.
- **CHANGES per band:** decodable text topics + vocabulary (high-interest/low-readability, not "Dave made a cake"); **activity format** (above); coach persona + voice; encouragement copy ("Great job superstar!" → respectful, low-saccharine, metacognitive); visuals; Part 8 comprehension markers scale with the older passage.

**K-3 activity-format reference:** `/Users/diaz/Desktop/Alphabet Lessons K-3` (symlink `reference/external/alphabet-lessons-k-3`) — Scholastic research-based alphabet/short-vowels resource: phonemic-awareness chant, trace-the-letter, **picture-sound sort** (drag by beginning/ending sound), **match-and-write**, **sound dominoes**, **color-and-read decodable storybook**. Reference the generic FORMATS only (not protectable); do NOT copy Scholastic's pages/art/wordlists (ip).

**Build leverage:** these reduce to a small library of reusable **activity templates** (sort, match, trace, color-read, chant-repeat) the engine FILLS with the current target's words/sounds — author once, reuse across every rung AND band by swapping fill-data + skin. Three bands of variety without three curricula.

**Sequencing (rec, not locked):** K-3 = baseline (already live); **7-8 next** (design against Yohanna = live student + sharpest MTSS/Title-I market differentiation); 4-6 last (interpolate between nailed endpoints).

- **NOTE on naming:** the "Yohanna rule" (never auto-FAIL a kid who understood) is a *grading-safety* principle, age-independent — keep it. This differentiation is the *separate* second thing Yohanna's case surfaced.

- **1b. Part TITLES show internal/adult labels, not kid-facing.** Part 1 = "Cumulative code review," Part 2 = "Explicit target concept," etc. Kids should see "Warm-up / words you know," "New thing to learn," etc. **Systemic across all 8 titles** — the player renders the generator's internal names; kid-facing titles aren't wired. (Supersedes the earlier "verify Cumulative code review" item — confirmed it's all titles.)

## 2. UX / LAYOUT FIXES — medium priority

- **2a. Part 3: make the WORD the button (tap-the-word-to-listen) — supersedes the "move the button" idea.** Today there's a single "Read {word}" button at the bottom + a highlighted current word at the top, so word and action/feedback are split (kid can't see the word and the result together). Kids instinctively tap the word itself. Redesign: **each word chip is tappable → tapping activates listening for THAT word (mic on, never on page load) → Harper listens → the result shows ON the chip** (green correct / amber retry) with Harper's message right beside it. This co-locates word + action + feedback (fixes the split), matches kid instinct, AND acts as an engagement gate (kid actively initiates each read). Scaffold ladder unchanged (correct→advance, miss→retry→reteach→assisted); pseudowords stay self-confirm (tappable to try, never scored); in-flight guard still blocks double-taps on the same word.
- **2b. Silly-words (pseudoword) UX is confusing.** Chips aren't tappable (confirm is the button), and there are two stacked silly-word displays. Make it one clear step.
- **2c. Rate limit too low → mid-lesson 429.** Transcribe route caps at 20/min; a real 20-word Part 3 + retries trips it, and Harper pauses ("Let's take a quick pause") mid-lesson. **Fix: bump `RATE_LIMIT_CAPACITY` 20 → 60** in `app/api/voice/transcribe/route.ts` (tested locally; needs a proper committed PR).

## 3. VOICE / "HARPER AS COACH" — high strategic priority

- **3c. Harper's real image never appears — placeholder blob instead.** The player renders `BuddyCharacter.tsx`, which is a crude placeholder (gray circle + dark blob + dot eyes), NOT the branded Harper art. `public/branding/harper-character-v1.png` exists but is never wired in. Fix: render the branded Harper image in the Harper panel (keep the idle/listening/speaking/confused state hooks already wired); v1 = static branded image, later per-state poses so she visibly reacts (listening when the kid reads). **Pairs with 3a as the "make Harper real" cluster** — right now Harper is a placeholder on BOTH channels (blob image + robot voice); the branded art + OpenAI TTS together are what make her feel like Harper. Highest-impact pair for product *feel*.
- **3a. TTS is robotic.** Currently the browser's built-in voice. Wire the spec'd **OpenAI TTS "shimmer"** (`specs/voice-tts-upgrade`). Central to Harper feeling like a warm coach vs a robot. Real build, not a flag.
- **3b. Listen-everywhere (Tier-1, no storage — near-term).** Per the capture-everywhere + coaching vision: Part 1 warm-up, Part 5 sentences, Part 7 story, and pseudowords should have Harper *listen* (not score) — for **pacing/accountability** (kids actually read instead of tapping through), **encouragement**, and eventually capture. Pacing + encouragement run on **Tier-1 service consent (in-session, no storage)** so they don't wait on the storage layer. Today those surfaces are silent.

## 4. CAPTURE + GRADING TRACK (consent + secure storage) — big, deliberate effort

- **4a. Production consent + secure-storage capture layer** — the one consent-gated capture pipeline all read surfaces plug into (warm-up, words, pseudowords, sentences, story). Tier-2 training opt-in. This is the gateway to the whole coaching/flywheel vision. Pseudoword audio = premium decoding data.
- **4b. Part 8 comprehension grading by mastery-markers / semantic proximity (Jonathan, 2026-06-13).** Auto-grade comprehension by checking whether the answer hits the KEY CONCEPTS that show mastery — NOT a black-box AI grade. Design: (1) **author per-question mastery markers** (key concepts / acceptable-answer ideas, e.g. "Why did Dave make the cake?" → gift/present/for Jane/for a pal); (2) grade by **semantic proximity** (catches synonyms/paraphrase — "a present for his friend" should pass; literal keyword match alone is too brittle), cheap embeddings v1, optional light LLM for borderline v2; (3) **confidence-gated, NEVER auto-FAIL** (Yohanna rule — a kid who understood but phrased/spelled it oddly must not be marked wrong): clear mastery → credit, uncertain → async teacher review, never auto-wrong; (4) teacher reviews uncertain → that's the **label that trains the grader** (same flywheel). Input note: Part 8 currently asks the kid to TYPE (slow/typo-prone for young readers) — **spoken answer (captured → transcribed → graded on meaning)** is far more natural and ties to the capture layer. Needs: authored markers + proximity grader + teacher-review UI + (ideally) spoken input.

## 5. WATCH-ITEMS (tune from real use, not bugs)

- **5a. Low-confidence retry.** A *correct* read with ASR confidence <0.55 gets "read it once more" rather than credit. Safe (never "wrong"), but may over-ask soft/quiet readers (Yohanna). Tune the threshold if it fires too often.
- **5b. No explicit `PART3_SCORING_MODE` flag.** Behavior is hardcoded `harper_retry_only` (correct). Add a config flag if pilot-switching is wanted.

## 6. LOCAL-DEV / INFRA (not product bugs)

- **6a. `NEXTAUTH_URL` points at a non-local URL** → caused the auth `CLIENT_FETCH_ERROR` / connection-refused weirdness in local dev. Set `NEXTAUTH_URL=http://localhost:3000` for local. (Local student login that works: `grade3.student@example.com` / `Password123!`.)
- **6b. `.env.local` line 5 `DATABASE_URL` has an unbalanced quote** → can crash the dev server. Fix the quote.
- **6c. CSS vanishes until `rm -rf .next`** — stale Next dev cache; clear it + hard-refresh if styling disappears.

## Build sequence (locked PR plan — Jonathan + Pro + Claude, 2026-06-13)

Discrete PRs, never one giant "fix the player" drop. The tappable-item primitive is built once and reused, but rolled out per-PR (Part 3 = the speech surface, audited alone). Gates are **gentle** — one interaction per item, not mastery; adult-override later.

- **PR A — kid-facing copy + titles (do first; small, high-impact):** 1a (a_e kidRuleStatement + reteachPrompt, Jonathan's wording) + 1b (replace internal part titles with kid-facing: Warm-up / New thing to learn / Read the words / Power words / Read sentences / Spell it / Read the story / Talk about it). Decide where titles live (content/generator field vs player-side map).
- **PR B — rate limit 20→60 (2c):** route stays process-and-drop, metadata-only ModelDecision, no persistence.
- **PR C — tap-to-hear gates, non-speech parts:** 1c (Part 2 example pairs) + 1d (Part 4 words individually tappable, own utterance, gate until heard). Builds the shared tappable-item primitive.
- **PR D — Part 3 word-chip redesign (the sensitive speech PR, audited alone):** 2a (word chip = the read button; feedback on the chip) + 2b (silly-word single clean line, self/adult confirm, never ASR-scored).
- **PR E — branded Harper image (3c):** wire `harper-character-v1.png`, keep state hooks.
- **PR F — OpenAI TTS "shimmer" (3a):** replace browserTts.
- **PR G — visual listening + per-unit gating for Parts 1/5/7 (NO mic):** tap each warm-up word / sentence / story unit, "Harper is listening" visual ritual, can't advance until each read. No audio, no scoring.
- **PR H — Tier-1 mic listen-everywhere:** process-and-drop, no scoring, no storage.
- **PR I — production consent + secure capture layer (the flywheel infra).**
- **PR J — Part 8 async teacher review + AI shadow-grading** (capture response → teacher grade = label → AI graduates only when it agrees; no student-facing AI grade).

Watch-items (5a/5b) tuned from pilot data; infra (6a/6b/6c) fixed as encountered. **Do NOT expand to more lesson targets until the a_e lesson feels excellent in a real kid's hands.**

## CORRECTION (2026-06-13): "kid produces" surfaces = kid READS, Harper LISTENS + records — not tap-to-hear / tap-I-read-it

Two item categories, applied consistently:
- **Harper MODELS** (Harper says it, kid hears, tap-to-hear is right): Part 2 rule examples, Part 4 heart/vocab words. These are *taught*.
- **Kid PRODUCES** (kid reads each item aloud, Harper LISTENS): **Part 1 warm-up words, Part 3 real words, Part 3 silly words, Part 5 sentences, Part 7 story.** Each = tap item → kid reads → Harper listens → encouragement → gate until all read → **capture the audio**. ONLY Part 3 real words are SCORED; the rest are listen-encourage-NO-score (Part-1 known words, pseudowords over-normalize, connected text has no alignment). ALL are flywheel capture targets.

Current build is wrong on two of these: **Part 1** ships as "tap → I read it" (no mic, gameable, no data) and **silly words** ship as "tap to hear" (Harper says them — defeats the decoding purpose). Both must become kid-reads / Harper-listens.

Three reasons (all of which Jonathan keeps naming): pacing/accountability (kid actually reads, can't skip), encouragement/presence, and DATA capture (the recordings).

Sequencing split (it's a child's voice): **listen + encourage + pacing-gate** runs on **Tier-1 consent** (mic in-session, no storage) — near-term; **the actual recording/capture** needs the **consent + secure-storage layer** (can't store a kid's voice without verifiable parental consent) — the capture track. So near-term these surfaces become "read each, Harper listens, no score, can't skip"; recording rides the storage track right behind. **This revises 2b (silly words) and the Part-1/3b listen behavior, and folds into PR G/H + the capture track.**

## WORD-FOLLOWING HIGHLIGHT for connected reading (Parts 5 & 7) — first-class capability (Jonathan, 2026-06-13)

As the student reads a sentence/story, Harper **highlights each word as it's read**. Purpose (all three): (1) reading SUPPORT — follow-along tracking helps struggling readers; (2) ANTI-GAMING — proves the kid actually read instead of tapping "Done" and Harper saying "I loved that!" (the documented i-Ready click-through problem); (3) the aligned audio = the cleanest connected-reading training data + eventual scoring.

**Tech reality:** real-time highlight synced to the kid's voice = **word-level alignment**, the same capability connected-text scoring needs (why 5/7 are listen-only today). This is the keystone connected-reading capability — one build, four payoffs (support + anti-gaming + scoring + training data). Raise its roadmap priority accordingly.

Two tiers:
- **Sooner — "Listen first" highlight:** when Harper reads aloud via TTS, highlight each word as she says it (karaoke-style; we control the timing). Buildable now; models fluent reading with tracking.
- **The real thing — highlight follows the KID's voice:** needs alignment. Most feasible first version = **record the reading → forced-align the audio to the known text → highlight on playback + verify completion + score later.** So the CAPTURE layer is the foundation: capture → align → highlight/verify/score → train. True real-time karaoke-as-they-read is the dream beyond that.

Belongs on the verifier roadmap (was "connected-word accuracy → needs alignment"); Jonathan's insight reframes alignment as support+anti-gaming+scoring+data, not just scoring.

## Settled — do NOT relitigate

Part 3 exact-match scoring · no "you said ___" · `VOICE_MISCUE_DETECTED` only after reteach · pseudowords self/adult-confirm (never transcript-scored) · Parts 5/7 no correctness scoring · no raw-audio persistence on the student path.

## Confirmed WORKING (don't relitigate)

Full 8-part a_e lesson on `main` (83346c2): Parts 1/2/4/6/8 (FL-1), Part 3 live read→retry→reteach on real gpt-4o-transcribe (FL-2), Parts 5/7 listen-and-encourage (FL-3). Exact-match scoring, no transcript echo, miscue-only-on-reteach, pseudoword self-confirm, in-flight guard, 429 handling, process-and-drop (no persistence), non-a_e disabled, events fire.
