# Sý Learning · Pilot UI Polish · Codex Spec

**Status:** Ready for Codex execution
**Target:** Pilot launch
**Canonical URL:** `https://sylearning.com` (with `synesislearning.com` redirecting in)
**Brand:** Sý Learning · Tagline: *Together We Learn*
**Companion docs:** `docs/mockups/` (HTML reference designs, restored in Phase 0), `branding/` (logo assets, restored in Phase 0)

---

## Brand reference (locked)

* **Product name:** Sý Learning (note the ý diacritic — required)
* **Tagline:** Together We Learn (capitalized as shown)
* **Etymology to use in About / origin copy:** "Sý" comes from the Greek prefix σύν (sýn), meaning *with, together, jointly*. The brand and tagline reinforce the same idea: kids learn together with the platform's AI Buddy.
* **Visual mark:** Use `public/branding/sy-learning-logo-v6.png` (full color, for light backgrounds), `public/branding/sy-learning-logo-v6-dark.png` (for dark backgrounds), and `public/branding/sy-learning-icon-v6.png` (icon-only, for app icons and mobile collapsed states). Favicons live at `public/branding/favicon-{16,32,180,512}.png`. The Open Graph card for social link previews lives at `public/branding/og-image-1200x630.png`. These are the finalized brand assets — do NOT regenerate or modify.
* **Subject scope:** Sý Learning is subject-agnostic. Reading is the first vertical; math and others may follow. Do NOT lock the brand or copy into "reading" exclusively.

---

## Goal

Bring the Sý Learning pilot app to mockup-fidelity visual polish on the 10 pilot-visible screens, without touching backend behavior, data models, or admin tooling. The work is **purely visual + chrome**: components keep their existing props, Prisma queries, and routing. Only the rendered output changes.

The metric of success: a teacher, parent, or student visiting any of the 10 pilot screens sees something visually consistent with the locked mockups, on-brand for Sý Learning, and free of placeholder text or stub-shaped UI.

---

## Scope decisions (already made — do not relitigate)

* The 10 pilot-visible screens are listed in Phase 2. Admin screens (`/admin/voice/*`) are explicitly out of scope and remain visually minimal.
* Mobile responsiveness is a Phase 3 priority (not nice-to-have, not blocking). Parents will check on phones; kids will use Chromebooks/tablets.
* The work is split across phases. Codex should open one PR per phase, not one big PR. This keeps review small and reversible.
* No new features. If a mockup shows a feature the backend doesn't support yet, render the visual element with a clear empty state — do not invent backend behavior to populate it.

---

## Phase 0: Restore lost assets

Branch: `codex/pilot-polish-phase-0-restore`
PR title: `Restore mockup + branding assets from history`

1. `git checkout fdff226 -- mockups branding`
2. Move recovered files to safer locations:
   * `mockups/*` → `docs/mockups/*` (keeps them as reference, out of the build path)
   * `branding/sy-learning-logo-v6.png` → `public/branding/sy-learning-logo-v6.png` (so Next.js can serve it)
   * `branding/sy-learning-icon-v6.png` → `public/branding/sy-learning-icon-v6.png`
   * Other branding files (SVG concepts, logo-concepts.html, trademark-attorney-email.md) → `branding/` (recreate the folder, keep as reference)
3. Add `docs/mockups/README.md` explaining what the mockups are, that they're a frozen visual reference, and that Phase 2 components should match them.
4. Commit.

**Definition of done:** All 12 mockup HTML files exist under `docs/mockups/`. The Sý Learning logo PNG exists under `public/branding/` (the file is still named `sy-learning-logo-v6.png` on disk for historical continuity; only the rendered wordmark changes). The branding folder exists at repo root with the concept SVGs and trademark email. No files are lost.

---

## Phase 1: Global brand + chrome

Branch: `codex/pilot-polish-phase-1-brand`
PR title: `Apply Sý Learning brand to global chrome and auth surfaces`

The goal of this phase is that *every* page in the app — even pages that haven't been touched yet — looks on-brand for Sý Learning. After Phase 1, an un-polished page is still presentable.

**Logo assets ready to use:** The finalized brand files are already in `public/branding/`. No wordmark editing needed — wire them in as-is.

- Full-color horizontal logo: `public/branding/sy-learning-logo-v6.png`
- Dark-mode horizontal logo: `public/branding/sy-learning-logo-v6-dark.png`
- Icon-only (rounded square with Sý mark): `public/branding/sy-learning-icon-v6.png`
- Favicons: `public/branding/favicon-{16,32,180,512}.png`
- Open Graph social card: `public/branding/og-image-1200x630.png`

### 1.1 Tailwind theme

Extend `tailwind.config.ts` with the Sý Learning brand tokens. Read the CSS from `docs/mockups/index.html` and the individual screen mockups to extract the actual color values, font choices, and spacing tokens used. Encode them as:

```ts
theme: {
  extend: {
    colors: {
      synesis: {
        // Pull these from the mockups — do not invent values
        primary: '...',
        accent: '...',
        ink: '...',
        // etc.
      },
    },
    fontFamily: {
      sans: ['...', ...defaultTheme.fontFamily.sans],
      display: [...],
    },
  },
}
```

If a mockup uses a Google Font, add the import via `app/layout.tsx`'s `<head>` metadata.

### 1.2 Real logo in header

Update `components/synesis/SynesisHeader.tsx`:
* Replace the placeholder yellow square with `<Image src="/branding/sy-learning-logo-v6.png" alt="Sý Learning" />` (sized to match the mockup header). On dark-background contexts (if any), use `sy-learning-logo-v6-dark.png`. On collapsed/mobile states where only the icon should appear, use `sy-learning-icon-v6.png`.
* If the mockup shows the icon-only logo in collapsed/mobile state, wire `sy-learning-icon-v6.png` accordingly.
* Keep the "Learning Woven Together" tagline.

### 1.3 Favicon and metadata

In `app/layout.tsx`:
* Set `metadata.icons` with the full favicon set:
  ```ts
  icons: {
    icon: [
      { url: '/branding/favicon-32.png', sizes: '32x32' },
      { url: '/branding/favicon-16.png', sizes: '16x16' },
      { url: '/branding/favicon-512.png', sizes: '512x512' },
    ],
    apple: '/branding/favicon-180.png',
  }
  ```
* Set `metadata.title.default` to "Sý Learning · Together We Learn" (keep the title.template for sub-pages).
* Set `metadata.description` to the platform's actual one-liner from the mockups.
* Set Open Graph metadata: `metadata.openGraph.images = [{ url: '/branding/og-image-1200x630.png', width: 1200, height: 630 }]` so link previews on iMessage/Slack/Twitter render the branded card.

### 1.4 Auth + onboarding screens

Style these pages with the SynesisPageShell (or equivalent unauthenticated shell):
* `app/login/page.tsx`
* `app/onboarding/page.tsx` (and sub-pages)
* `app/forgot-password/page.tsx`
* `app/reset-password/page.tsx`
* `app/parental-consent/page.tsx`
* `app/data-request/page.tsx`
* `app/legal/*` (privacy, terms)

Create `components/synesis/SynesisAuthShell.tsx` if needed — same brand, lighter chrome (no nav, just logo + footer).

### 1.5 Fix visible placeholder bugs

* Replace any literal `[domain]` placeholder strings with `privacy@sylearning.com`. The canonical domain is now `sylearning.com`; ImprovMX forwards `privacy@`, `support@`, `hello@`, and a catch-all to the founder's inbox. If the trademark eventually requires a brand change, this gets find-replaced in one pass.
* Sweep for any other `[placeholder]` patterns and fix or comment.

### Phase 1 definition of done

* Login page shows the Sý Learning logo (reading "Sý Learning" in the wordmark), on-brand colors, on-brand typography.
* Every authenticated page shows the Sý Learning header with the real logo.
* Browser tab shows the Sý Learning favicon (`sy-learning-icon-v6.png` is fine as the file — it's the "Sý" mark only, which still applies).
* Page title in the tab reads "Sý Learning · Together We Learn" on the home/login screen and "<Page> · Sý Learning" on sub-pages.
* "Sýnesis" appears nowhere on user-visible surfaces (it's fine in code identifiers like `components/synesis/` or filenames like `sy-learning-logo-v6.png` — those are internal historical artifacts).
* No `[domain]` or `[placeholder]` strings render on any user-visible page.
* `npm run build` succeeds with no new warnings.
* `npx tsc --noEmit` passes.

---

## Phase 2: Page-by-page mockup fidelity

Branch per screen: `codex/pilot-polish-phase-2-<screen-slug>`
PR title per screen: `Polish <screen-name> to mockup fidelity`

For each of the 10 screens below, the work is the same shape:

1. Open the mockup HTML at the listed path.
2. Identify the existing skeleton component(s) at the listed path.
3. Rewrite the component(s) to match the mockup visually, while:
   * Preserving the existing component props and types.
   * Preserving the existing Prisma queries and data flow in the parent page.
   * Substituting real data fields where the mockup has hard-coded sample values.
   * Adding loading and empty states for fields the backend may not populate yet.
4. Add a Storybook-style preview at `app/dev/preview/<screen-slug>/page.tsx` (gated to admin only) that renders the component with mock data, so you can visually compare against the mockup without needing a real student session.
5. Commit and open one PR per screen.

Do screens in this order — they're listed by "what a pilot teacher demo would touch first":

### 2.1 Teacher caseload (highest-leverage demo screen)

* Mockup: `docs/mockups/teacher-caseload.html`
* Component: `components/literacy/TeacherLiteracyMonitor.tsx`
* Page: `app/teacher/literacy/page.tsx` (create if doesn't exist)
* Key visual elements per mockup: striving-readers table with 4-strand summary, "click for full 6-strand profile" affordance, Ehri-phase chips, sortable columns.

### 2.2 Teacher student detail

* Mockup: `docs/mockups/teacher-student-detail.html`
* Components: `components/literacy/StudentLiteracyProfile.tsx`, `LiteracyStrandPanel.tsx`, `PhonogramMasteryGrid.tsx`, `SyllableTypeGrid.tsx`, `EhriPhaseBadge.tsx`, `AutopilotDecisionFeed.tsx`
* Page: `app/teacher/literacy/student/[studentId]/page.tsx` (create if doesn't exist)
* Key visual elements: Ehri-phase headline with Lexile supporting tag, 6-strand panel with Morphology highlighted as highest-leverage gap, full-width phonogram + syllable-type mastery grid (heatmap), autopilot decision feed.

### 2.3 Student practice with Buddy

* Mockup: `docs/mockups/voice-practice.html`
* Components: `components/literacy/StudentPracticeSession.tsx`, `BuddyCharacter.tsx`
* Page: `app/student/practice/voice/page.tsx`
* Key visual elements: Buddy character with personality (idle/listening/speaking/confused states), passage rendered with phonogram-aware chunking, large mic button, real-time waveform or pulse during recording.

### 2.4 Speed drill

* Mockup: `docs/mockups/speed-drill.html`
* Components: `components/literacy/SpeedDrillSession.tsx`, `SpeedDrillTimer.tsx`
* Page: `app/student/speed-drill/page.tsx`
* Key visual elements: three sub-views (warm-up → drill running → results). Warm-up shows Buddy announcing the pattern. Drill shows 1-minute timer ring + live word stream + counter (correct / self-fixed / missed). Results show 8-run progress chart and tomorrow-rotation preview.

### 2.5 Voice diagnostic (initial assessment)

* Mockup: `docs/mockups/voice-diagnostic.html`
* Components: `components/literacy/StudentDiagnosticFlow.tsx`
* Page: `app/student/diagnostic/voice/page.tsx`
* Key visual elements: friendly intro from Buddy, progress indicator across the 6 strands, calibration steps, adult-facing results screen with Ehri-phase placement.

### 2.6 Student practice (non-voice)

* Mockup: `docs/mockups/student-practice.html`
* Page: `app/student/practice/page.tsx`
* Key visual elements: card-based activity selection, Buddy chrome consistent with voice practice.

### 2.7 Student diagnostic (non-voice)

* Mockup: `docs/mockups/student-diagnostic.html`
* Page: `app/student/diagnostic/page.tsx`

### 2.8 Parent dashboard

* Mockup: `docs/mockups/parent-dashboard.html`
* Component: `components/literacy/ParentLiteracyDashboard.tsx`
* Page: `app/parent/page.tsx` (or `app/parent/literacy/page.tsx`)
* Key visual elements: at-a-glance child progress, weekly auto-send update preview, link to voice sessions, link to settings/consent.

### 2.9 Parent voice sessions

* Mockup: `docs/mockups/parent-voice-sessions.html`
* Components: `components/literacy/ParentVoiceSessionsPage.tsx`, `VoiceSessionTimeline.tsx`
* Page: `app/parent/literacy/voice-sessions/page.tsx`

### 2.10 Dialect onboarding (sensitive — do not ship rough)

* Mockup: `docs/mockups/dialect-onboarding.html`
* Component: `components/literacy/DialectOnboardingFlow.tsx`
* Page: Wherever it's mounted in the consent/onboarding flow.
* Key visual elements: four skip-able steps with clear progress indication. Step 3 must include the amber "what we're NOT doing" callout exactly as in the mockup. Final confirmation must show exactly what changes about how the program listens.
* **Extra requirement for this screen:** the flow must be feature-flagged. The flag should default to OFF for pilot districts. When OFF, the dialect-onboarding step is skipped entirely in the onboarding flow.

### Phase 2 definition of done (per screen)

* Component visual matches the mockup (a side-by-side screenshot comparison should look the same).
* Real session data renders correctly (test with a seed user via the dev preview).
* Empty states render correctly when data is missing.
* No TypeScript errors.
* No accessibility regressions (axe-core or eslint-plugin-jsx-a11y passes).

---

## Phase 3: Cross-cutting QA

Branch: `codex/pilot-polish-phase-3-qa`
PR title: `Cross-cutting accessibility, responsive, and polish fixes`

### 3.1 Screenshot comparison

For each of the 10 polished screens, capture a screenshot at 1440px wide and compare to the corresponding mockup. Note differences in a `docs/pilot-polish-qa-report.md` and fix the ones that materially affect perceived polish.

### 3.2 Accessibility

Run `axe-core` against each polished page in a headless browser. Fix any errors. Specifically check:
* All interactive elements have visible focus indicators.
* All images have alt text (the Buddy character needs descriptive alt text per state).
* Color contrast meets WCAG AA on text, AAA on body text where reasonable.
* All form inputs have associated labels.
* No keyboard traps in the dialect-onboarding flow.

### 3.3 Mobile responsiveness

For each polished page, verify at 375px (iPhone SE), 414px (iPhone Pro), and 768px (iPad portrait):
* Layout doesn't break.
* Tap targets are at least 44×44px.
* Buddy character remains visible and friendly at mobile widths.
* Tables (teacher caseload, phonogram grid) gracefully collapse to scrollable or stacked layouts.

### 3.4 Final sweep

* Browser console is clean (no warnings, no errors) on each polished page.
* All `TODO` and `FIXME` comments added during this work have a tracking issue.
* Migration banner copy is accurate and dismissible.

### Phase 3 definition of done

* `docs/pilot-polish-qa-report.md` exists with screenshots and a per-screen QA summary.
* No `axe-core` violations remain on any of the 10 screens.
* All 10 screens render correctly at the three mobile breakpoints listed above.
* `npm run build` succeeds with no new warnings.
* `npx tsc --noEmit` passes.

---

## What this spec does NOT do

* Backend changes (the spec is explicit: data models, Prisma queries, API routes, scoring logic all stay as-is).
* Admin screens (`/admin/voice/*` and other admin areas stay visually minimal).
* The marketing/landing site (separate concern — the v0 spec assumes pilot users arrive via direct teacher invite, not via marketing site).
* New backend features. If a mockup shows something the backend doesn't support, render an empty state, do not invent the feature.
* Content authoring tools (the teacher-facing "create lesson" workflow is separate).
* Real content seeding (Reading Buddy will run on the auto-generated phonogram word lists until the user uploads curated passages — separate content intake workstream).

---

## Risk + rollback

Each phase is its own PR, mergeable independently. If Phase 1 ships and a Phase 2 screen breaks, the polished chrome stays and only that screen's PR gets reverted. If Phase 0 is wrong (assets in wrong place), it's a one-commit revert.

Branch protection should require: `npm run build` passes, `npx tsc --noEmit` passes, and one reviewer approval. CI is not yet set up for visual regression testing — for pilot, manual screenshot review is acceptable.

---

## How to run

1. Start with Phase 0. Confirm assets restored.
2. Run Phase 1. Manually verify login page looks on-brand before merging.
3. Run Phase 2 screens in the order listed. Merge each PR after manual review of the dev preview.
4. Run Phase 3 last, against the merged result of Phases 0–2.

If at any point Codex needs a judgment call beyond what's in this spec, pause and ask before guessing. Visual decisions made unilaterally during pilot polish are expensive to undo.
