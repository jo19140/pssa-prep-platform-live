# TODO: Ello-Inspired Website Changes for sylearning.com

**Source:** Competitive analysis of ello.com homepage, 2026-06-25
**Purpose:** Actionable to-do list of website + business-model changes Sý Learning should adopt from Ello (closest direct competitor). Pull into a new Cowork chat with the brand foundation doc + the Meet Harper handoff doc and execute in priority order.

**Pre-reading for the new session:**
- `branding/HANDOFF-meet-harper-section-2026-06-06.md` (Meet Harper section spec — may already be merged by the time you read this)
- `branding/reading-buddy-positioning-2026-06.md` (v2 brand foundation)
- `branding/competitive-landscape-2026-06.md` (full competitive landscape; Ello deep-dive in Section 1)
- Memory: `project_synesis_brand_decision.md`, `feedback_no_fake_statistics.md`

---

## PRIORITY TIER 1 — Ship with the in-flight Meet Harper PR (or immediately after)

These are pure copy/asset/layout additions that don't need backend work. Land them in the same PR as the Meet Harper section if it hasn't merged yet, or as a fast follow-up PR.

### 1.1 — Show Harper in multiple states, not just one

**What to do:** The Meet Harper section currently uses a single Harper character pose (`harper-character-v1.png`, isolated). The Harper style sheet (`harper-style-sheet-v1.png`) contains four expressions — Encouraging, Listening, Explaining, Proud of You — plus three in-action panels (Listens to your child read / Teaches the next sound pattern / Sends a simple update to parents). Extract those individual character variants and use them across the homepage.

**Specifically:**
- Hero or Meet Harper section: Harper in Listening pose (existing)
- "How It Works" or a new "What Harper Does" mini-section: three Harper-in-action vignettes (Listens / Teaches / Sends update) with one-line captions each
- Final CTA section: Harper in Proud-of-You expression

**Asset extraction:** The style sheet is one PNG. The expressions need to be cut into individual transparent-background PNGs. Either commission this from a designer for ~$50, or do it manually with image editing. New file names:
- `public/branding/harper-expression-encouraging.png`
- `public/branding/harper-expression-listening.png`
- `public/branding/harper-expression-explaining.png`
- `public/branding/harper-expression-proud.png`
- `public/branding/harper-action-listens.png`
- `public/branding/harper-action-teaches.png`
- `public/branding/harper-action-updates.png`

**Effort:** Small (1-2 hours design + small Codex PR to wire them in)
**Dependency:** Meet Harper section merged or in flight
**Why:** Static character feels like a logo. Multiple character states show what the product actually does. Ello uses this exact pattern; parents respond to it.

### 1.2 — Add "The Problem" section with the NAEP stat

**What to do:** New section above or below Meet Harper. Lead with the externally sourced NAEP statistic. Ello uses the same play.

**CORRECTION (2026-06-25, verified against NAEP 2024):** An earlier version of this doc cited "65% of 4th graders reading below grade level." That number does NOT match any real NAEP figure cleanly — it appears to be an outdated rough approximation of the "below Proficient" framing (2022 was 67%, 2024 is 69%), and NAEP/NCES explicitly warn that "Proficient" does NOT mean "grade level." Do NOT ship the 65%/grade-level version. Use the verified figure below.

**Copy draft (verified 2024 NAEP):**
> **40% of U.S. 4th graders can't read at a basic level.**
>
> *Source: The Nation's Report Card, 2024 NAEP Reading Assessment (NCES), grade 4. https://www.nationsreportcard.gov/reports/reading/2024/g4_8/?grade=4*
>
> Most reading apps treat this like a content problem — more books, more games, more screen time. It's actually a decoding problem. Kids who can't hear the sound patterns of English can't read the words on the page. Harper teaches the sound patterns directly, listens as your child practices, and meets them where they are.

**Why this figure:** 40% is the "below NAEP Basic" share — the largest of its kind since at least 2002. It's the conservative, fully defensible "struggling readers" number. It's also what NAEP itself leads with for "struggling," and "can't read at a basic level" hits harder emotionally than a vague "below grade level."

**Alternative figure (also defensible):** "Only 31% of U.S. 4th graders are proficient readers." — flip of the at/above-Proficient share. Avoids the grade-level equivalence trap.

**Effort:** Small (copy + section component, 1-2 hours)
**Dependency:** None
**Watch out:**
- Do NOT use the phrase *"reading below grade level"* anywhere near a NAEP citation. NAEP explicitly warns against equating "NAEP Proficient" with "grade level" — using that wording with a NAEP source is the specific misuse a journalist or skeptical parent could call out.
- Verify the current NAEP figure at publish time — they update on a 2-year cycle. The 2024 release is current as of June 2026; a 2026 release may land later this year.
- Per `feedback_no_fake_statistics.md`, ship only the figure with a verified source link to nationsreportcard.gov, not a second-hand citation.

### 1.3 — Add "Goodbye Homework Fights" section

**What to do:** Direct emotional pain section that names the homework battle. Ello has "Goodbye Reading Fights" — same architecture, same wedge as Sý Learning's locked "homework helplessness" enemy framing.

**Section structure:**
- Headline: *Goodbye Homework Fights*
- Three checkmark items:
  - *Be the parent, not the reading teacher*
  - *Harper handles the lesson — you handle bedtime*
  - *Daily reading practice without the daily fight*
- Optional Harper-in-action illustration on one side

**Effort:** Small (1-2 hours)
**Dependency:** None
**Why:** Pure parent emotion. Names the pain the parent feels at the kitchen table at 7 PM. This is one of the highest-converting copy moves Ello does.

### 1.4 — Founder credential block on homepage

**What to do:** Add a small section showing Jonathan as founder + active classroom teacher. Photo, name, one-line credential. This is the credential Ello doesn't have and that you should not bury.

**Copy draft:**
> **Built by a teacher who's still in the classroom.**
>
> *Jonathan Diaz — Founder & active K-3 classroom teacher, Pennsylvania.*
>
> Sý Learning was designed in the same room where children were learning to read. Every phonics decision, every Harper interaction, every parent update was pressure-tested with real students before it shipped.

**Effort:** Small (photo + copy + section component, 1-2 hours). Photo of Jonathan needed.
**Dependency:** Jonathan provides a professional-quality photo
**Privacy note:** This is Jonathan's likeness, not his children's — explicit consent of self only. Stays on-strategy with the Harper privacy guardrail.
**Watch out:** Ethics overlap. The founder-status memory flags that Jonathan can't pitch his own district. Featuring him publicly as "an active PA classroom teacher" is FINE — that's a public fact, not a vendor pitch to his employer. But do not put the district name on the website.

---

## PRIORITY TIER 2 — Business model / backend changes (separate PRs, parallel work)

### 2.1 — Surface pricing on the homepage

**What to do:** Add a pricing section below Meet Harper with two plan cards.

**Plan structure (mirrors Ello):**

| Plan | Price | Includes | CTA |
|------|-------|----------|-----|
| Monthly | $14.99/mo (14-day free trial) | Reading Buddy app, Harper AI coach, all phonics lessons, parent updates, 3 reader profiles | Start free trial |
| Annual (Save ~22%) | $139/yr (14-day free trial) | Same as monthly + annual price lock | Start free trial |

**Decisions needed before shipping:**
- Final pricing — match Ello at $14.99/mo, undercut at $12.99/mo, or premium-position at $17.99? Recommend matching Ello for now (signals same category, easier to test).
- Annual discount — match Ello's ~22%, deeper discount, or skip annual until volume validates?
- Trial length — 14-day is the locked default per `reading-buddy-positioning-2026-06.md`.

**Effort:** Medium. Frontend section + signup flow integration with Stripe + plan logic.
**Dependency:** Stripe account, plan SKUs configured, signup flow already supports plan selection
**Why:** Surfacing price reduces signup friction. Parents who can't afford $15/mo self-select out before signup. Better for both sides.

### 2.2 — Sý Learning Access program (EBT/SNAP discount)

**What to do:** Equivalent to Ello Access. Qualifying families pay a steeply discounted rate. Builds mission credential + press value + actual access for the families who need literacy intervention most.

**Program design:**
- Name: **Sý Learning Access** (parallel to Ello Access naming)
- Price: $0.99/mo (matches Ello) OR $1.99/mo (slight premium positioning) — recommend $0.99 to match
- Eligibility list (copy from Ello, this is well-established): SNAP, EBT, WIC, NSLP, TANF, SSI, Medicaid, LIHEAP, Direct Express, Tribal TTANF, Puerto Rico NAP
- Application flow: form on `/access`, parent uploads proof of eligibility (photo of EBT card or letter), 1-business-day review, approved families receive a unique coupon code
- Renewal: annual re-verification

**Effort:** Medium. New `/access` page, application form (Airtable or Tally for v1, custom later), Stripe coupon system, manual review process initially. Roughly 2-3 days of work end-to-end.
**Dependency:** Pricing section live (2.1)
**Why:** Both ethically right and strategically smart. Common Sense Media, Forbes, Washington Post all wrote about Ello Access — it's PR magnet. Press matters more than the foregone revenue.
**Watch out:** Compliance — applications collect sensitive data (proof of public benefits). Do not store EBT card images long-term. Hash or redact after verification.

### 2.3 — Three reader profiles per subscription (no per-child pricing)

**What to do:** Subscription tier covers up to 3 reader profiles in the same household. Families with siblings don't pay twice.

**Implementation:**
- Account-level subscription, not user-level
- Up to 3 reader profiles per account
- Each profile has independent reading-level, lesson history, voice data
- Parent dashboard shows all 3 profiles
- (Future: optional add-on for additional profiles if a family has 4+ kids — defer pricing decision)

**Effort:** Depends on current architecture. If the existing PSSA platform's user model already supports parent → student profile relationships (check `app_state_map` memory and the unified shell + parent dashboard Phase 1 work), this may be partially built. Audit before building.
**Dependency:** Pricing section live (2.1)
**Why:** Lower per-household resistance. Increases retention (sibling momentum effect). Standard for consumer edtech.

### 2.4 — Referral program

**What to do:** Each subscriber gets a unique referral link. Friend signs up via the link, gets their first month free. Referrer gets one month of credit per successful referral (no cap).

**Implementation:**
- Generate unique referral URL per account (e.g., `sylearning.com/r/{shortcode}`)
- Track referral attribution via cookie + Stripe metadata
- On successful trial-to-paid conversion of the referee: apply $14.99 credit to referrer's next bill
- "Refer a friend" link in account settings, with copy-to-clipboard share button + pre-filled email/SMS templates
- Email referrer when someone starts a trial via their link, and again when they convert

**Effort:** Medium-large. 3-5 days of work depending on Stripe integration depth.
**Dependency:** Pricing live + Stripe billing live
**Why:** Cheapest customer acquisition channel. Once you have ~100 subscribers, referral can produce free new signups roughly equal to the credit you give existing customers. Strategic compounding.

---

## PRIORITY TIER 3 — Brand / marketing language additions

### 3.1 — Name and brand the engine

**What to do:** Sý Learning's underlying AI tutor architecture is phonogram-explicit + Ehri-phase-aware + dialect-aware. Right now it has no name. Ello calls theirs "Adaptive Learn™." Pick a Sý Learning equivalent and start using it consistently across the website, deck, and copy.

**Candidate names** (pick one):
- **Phonogram Path™** — direct, names the methodology, clear differentiator
- **Sound Compass™** — warmer, parent-friendly, less technical
- **Read-Aloud Engine™** — names what it does, less distinctive
- **Harper Engine™** — character-tied, but conflates character with tech

**Recommendation:** Phonogram Path™. Names the actual differentiator. Parents and journalists will learn the word "phonogram" through repetition. Investors will recognize the technical specificity.

**Where to use it:**
- Subhead under Meet Harper: *"Powered by Phonogram Path™, our phonogram-explicit reading engine"*
- Trust strip: *"Phonogram Path™ · Ehri-aware · Dialect-aware listening"*
- Pitch deck: dedicated slide on Phonogram Path™ architecture
- Press release boilerplate

**Effort:** Trivial — just a copy + memory update.
**Dependency:** None
**Watch out:** Trademark. Re-engage Gerben Law Firm to add Phonogram Path™ (or whichever name) to the trademark filing alongside Sý Learning + Reading Buddy + Harper + Damien.

### 3.2 — "As seen in" press logo bar

**What to do:** Section showing press logos for media mentions of Sý Learning. Ello has ABC, Washington Post, TechCrunch, Forbes, Psychology Today. Sý Learning hasn't been featured anywhere yet — add this section as soon as the first mention exists.

**Path to first press mention:**
- Pitch a local PA outlet (Inquirer, PennLive, Trib) on the "PA teacher building AI reading tutor" story
- Pitch EdSurge or EdWeek on a teacher-founder angle
- Apply to TechCrunch Disrupt Startup Battlefield (Sept-Nov 2026)
- Sý Learning Access program launch is the kind of story Forbes / Fast Company picks up — that's downstream of Tier 2.2

**Effort:** Section component is trivial. Earning the first mention is the actual work.
**Dependency:** At least one press mention exists
**Why:** Social proof. Parents trust products that named publications wrote about.

### 3.3 — Free public library as top-of-funnel

**What to do:** New page at `sylearning.com/library` (or `/books` or `/resources`) with free decodable reading content. Pulls in parents Googling "free decodable books for K-3" — once there, the Harper coach upsell is one click away.

**Content sources:**
- Sý Learning has substantial content via the lesson engine + PSSA item bank (per memory, Phase 4 complete with 28 phonogram targets + Grade 3 PSSA bank with 91 items)
- Take a curated subset and surface it as free
- Mark them as free decodable books / reading practice
- "Want Harper to listen as your child reads these?" CTA on every page

**Effort:** Medium. Content selection + page templates + maybe a content management workflow.
**Dependency:** Decision on which content to surface free vs gate behind subscription
**Why:** Cheapest SEO traffic in literacy edtech is "free decodable books" queries. Ello dominates this; Sý Learning can compete here too. The free-content top-of-funnel has paid for Ello many times over.

---

## WATCH-OUTS — things NOT to copy from Ello

1. **"World's Most Advanced Reading Coach"** — Ello's hero overclaims with this language. Sý Learning's brand spec explicitly avoids hype words like "world's most advanced." Keep your "Reading practice that listens." — warmer, doesn't overclaim, more defensible.

2. **Physical book shipping model** — Ello's gift boxes and physical decodable book library are a real revenue line for them but it's also their biggest differentiator-to-attack-against. Sý Learning is *positioned against* that model. Don't add it back in.

3. **"Adaptive Learn™" technology branding overdone** — Ello uses the trademark on every page. Once is enough. Branded engine names lose power when repeated 8 times in one scroll.

4. **Marketing-only review widgets** — Ello uses Reviews.io. Don't add a review widget until you have real review volume (50+ reviews minimum). A widget showing 3 reviews looks worse than no widget.

---

## RECOMMENDED EXECUTION ORDER

**Week 1 (immediate, can ship with the Meet Harper PR if it's still in flight):**
- 1.2 The Problem / NAEP stat
- 1.3 Goodbye Homework Fights
- 1.4 Founder credential block
- 3.1 Brand the engine (Phonogram Path™)

**Week 2-3 (parallel work):**
- 1.1 Extract Harper expressions + wire across pages
- 2.1 Pricing on homepage
- 2.3 Three reader profiles per subscription

**Week 4-6:**
- 2.2 Sý Learning Access program
- 2.4 Referral program

**Whenever earned/built:**
- 3.2 Press logo bar (when first press mention exists)
- 3.3 Free public library (when content selection is decided)

---

## KEY DEPENDENCIES + UNRESOLVED DECISIONS

- **Pricing decision:** match Ello at $14.99/mo, undercut, or premium-position?
- **Annual discount depth:** match Ello's ~22%, deeper, or skip until validated?
- **Sý Learning Access price:** $0.99/mo to match Ello, or $1.99 to preserve some margin?
- **Engine brand name:** Phonogram Path™ recommended; needs lock-in.
- **Stripe configuration:** subscriptions, plans, coupons, and webhook handling needed for 2.1-2.4 to work.
- **Free library content scoping:** which lessons / passages / books surface free vs gated?
- **Trademark refile:** Phonogram Path™ (or whatever) needs to be added to the Gerben Law filing alongside the marks already noted in the brand decision memory.

---

*Compiled 2026-06-25 from competitive analysis of ello.com. Pull this into the next Cowork session along with the brand foundation doc and the Meet Harper handoff doc.*
