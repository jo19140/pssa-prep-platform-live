# Coach Mode redesign · PR1 — BAND_7_8 light palette (contrast fix) · Codex spec (v2, post-Pro)

**Date:** 2026-06-16 · Verified against `origin/main` (post-P4A). Design direction: **Option B (light focus)**, chosen from the redesign mock (first-real-run feedback Q1: slate-950 Coach theme too dark). Backlog: `specs/p4a-pilot-feedback-backlog.md`. Visual contract (palette/contrast only): `specs/mockups/coach-mode-redesign-mock.html`.
**Goal:** re-skin the **BAND_7_8 `COACH_THEME`** from near-black slate-950 to a **light, high-contrast** palette. **This PR is a deterministic token-VALUE swap only** — no layout/structure/copy/interaction, no component edits. K-3 byte-identical.

## Why this fixes legibility with NO component change (grounded)
`StudentPracticeSession.tsx` renders the lesson title (`h1`, line 168) and part title (`h2`, line 198) with **no text-color class** — they inherit from `theme.layout.page`. Today `page` sets `text-slate-50` (light) on `bg-slate-950`; flipping `page` to `text-slate-900` on a light bg makes both headings **dark-on-light = legible**, no component edit. The other hardcoded component colors (violet "Part N" badge line 201; `text-slate-500` subtitles lines 169/199; Part-3 cream/`bg-white`/`text-slate-900` cards) are **light-theme classes** that currently clash on dark slate and become consistent again on a light theme. The only true leftovers are a few hardcoded amber/cream accents and actions (e.g. the amber arrow `text-amber-700` line 409, cream buttons lines 422/875) — those stay for PR2 (see acceptance).

## EXACT token map — change ONLY these `COACH_THEME` values in `lib/literacy/presentationCopy.ts`
Replace each value verbatim. Keep every token KEY and all non-color classes (radius/padding/layout/`disabled:` utilities) as written below. `layout.grid`, `layout.showAdultEvidencePanel` (`false`), and `shell.adultPanel` (`= K3_THEME.shell.adultPanel`) are **UNCHANGED**.

```
layout.page:           "min-h-screen bg-slate-100 px-3 py-4 text-slate-900 md:px-5"
shell.rail:            "rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]"
shell.brandBadge:      "grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-xl font-black text-white"
shell.brandText:       "text-xs font-black uppercase tracking-wide text-indigo-700"
shell.navActive:       "border-indigo-300 bg-indigo-50 text-indigo-900"
shell.navComplete:     "border-emerald-300 bg-emerald-50 text-emerald-800"
shell.navIdle:         "border-slate-200 bg-white text-slate-600"
shell.header:          "flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
shell.targetPill:      "inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-900"
shell.secondaryButton: "rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700"
shell.primaryButton:   "rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow"
shell.lessonFrame:     "grid min-h-[650px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:grid-cols-[260px_minmax(0,1fr)]"
shell.buddyPanel:      "border-b border-slate-200 bg-slate-50 p-5 text-center lg:border-b-0 lg:border-r"
shell.speechBubble:    "rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-extrabold leading-relaxed text-slate-800"
shell.metaBox:         "mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left text-xs font-black text-slate-600"
shell.activitySurface: "flex flex-1 flex-col rounded-[26px] border border-slate-200 bg-white p-5"
cards.blueNotice:      "rounded-3xl border-2 border-indigo-200 bg-indigo-50 p-4 text-base font-black leading-relaxed text-indigo-900"
cards.amberNotice:     "rounded-3xl border-2 border-indigo-300 bg-indigo-50 p-5 text-xl font-black leading-relaxed text-slate-900"
cards.demoCard:        "rounded-3xl border-2 border-slate-200 bg-white p-6 text-center"
cards.generatedCard:   "rounded-3xl border-2 border-slate-200 bg-white p-4"
cards.neutralCard:     "rounded-3xl border border-slate-200 bg-white p-4"
cards.dashedCard:      "mx-auto max-w-xl rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6"
cards.primaryAction:   "rounded-2xl bg-indigo-600 px-5 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
cards.secondaryAction: "rounded-2xl border border-slate-300 bg-white px-5 py-4 font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
```
(No implementer-chosen shades — implement these exactly. `shadow-xl`→`shadow-sm` on the three visible Coach surfaces — `rail`, `header`, `lessonFrame` — is intentional for light; `adultPanel` stays inherited and hidden.)

## Mock scope — palette ONLY
`specs/mockups/coach-mode-redesign-mock.html` is authoritative for PR1 **only on palette, contrast, and surface hierarchy**. The structural features it also shows — 8-step progress strip, "Part N of 8" header, filled/listenable cap→cape demo cards, pinned Continue bar, passage Stop control — are **explicitly NOT PR1 acceptance criteria.** Existing layout and interactions remain unchanged. Those belong to PR2.

## Hard guardrails
- **K-3 (`K3_THEME`/`K3_COPY`) byte-identical** — do NOT touch them; the hardcoded K-3 snapshot in `scripts/test-presentation-copy.ts` must still pass unchanged.
- **Token-values only.** Do NOT change token keys, the theme/copy object shapes, `presentationThemeFor`/`presentationCopyFor` logic, any COPY, or **any component** — `StudentPracticeSession.tsx` and `BuddyCharacter.tsx` remain UNTOUCHED. If a legible result seems to need a component edit, STOP and report (it's PR2).
- **Existing component-hardcoded colors may remain in PR1.** Record any visual inconsistency (e.g. amber/cream accents and actions not yet indigo) for PR2 — do NOT normalize them here.
- Harper's image unchanged. `BAND_7_8` still appears only in `presentationCopy.ts`.

## Acceptance / tests
- **Add a hardcoded `expectedCoachTheme` snapshot** in `scripts/test-presentation-copy.ts` containing exactly the token map above (every key, the unchanged `grid`/`showAdultEvidencePanel:false`/`adultPanel`), and `assert.deepStrictEqual(presentationThemeFor("BAND_7_8"), expectedCoachTheme)`. This executes the "same keys/structure, only values changed" requirement and blocks a partial conversion. Keep `expectedK3Theme` and its three assertions completely untouched. Keep the existing BAND_7_8 behavior asserts (`showAdultEvidencePanel===false`, Harper name/alt, `notDeepStrictEqual` K-3) — still true.
- `npm run test:presentation-copy` green; `npx tsc --noEmit`; `npm run build`.
- `git grep -n "BAND_7_8" -- components/literacy/StudentPracticeSession.tsx components/literacy/BuddyCharacter.tsx` → still ZERO.
- **Manual (scoped):** as `grade7-voice-smoke@example.com`, `/student/practice` is light, every `COACH_THEME`-controlled surface matches Option B, and **all part-title headings are clearly legible**. `COACH_THEME`-controlled primary actions are indigo. Component-hardcoded colors (amber/cream accents and actions) may still look inconsistent — that's expected, logged for PR2, NOT a PR1 failure. K-3 student (`grade3.student@example.com`) renders exactly as before.

## Pre-Codex tracking (do first)
Both files must be committed/tracked before Codex starts (don't rely on the screenshot or an untracked working-tree file): `specs/coach-mode-redesign-pr1-light-palette-spec.md` + `specs/mockups/coach-mode-redesign-mock.html`, on a clean Reading Buddy spec branch off `origin/main`.

## Scope (files)
**Implementation scope (relative to the tracked spec branch `spec/coach-mode-pr1-palette`):**
- `lib/literacy/presentationCopy.ts` (COACH_THEME token values only)
- `scripts/test-presentation-copy.ts` (add `expectedCoachTheme` deep-equal; K-3 untouched)

**Full PR scope (relative to `origin/main`):** the two implementation files above **plus** the two already-tracked design docs that the spec branch carries:
- `specs/coach-mode-redesign-pr1-light-palette-spec.md`
- `specs/mockups/coach-mode-redesign-mock.html`
- `lib/literacy/presentationCopy.ts`
- `scripts/test-presentation-copy.ts`

No other files. If anything else is required, STOP and report — it's PR2.
