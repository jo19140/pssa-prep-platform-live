# Sý Learning · Logo Update Brief

**Status:** Ready for designer or AI image generation
**Source file:** `branding/synesis-logo-v5.png` (reference attached when handing off)
**Target file:** `branding/sy-learning-logo-v6.png` (final output)

---

## What we're keeping (do NOT change)

### The icon mark (left side of the existing logo)

- **Rounded purple/navy square** with the stylized "Sý" inside
- The white serif "Sý" with the diacritic dot above the y — **must remain pixel-identical**
- The flowing purple/blue/orange wave/ribbon pattern behind the Sý — **must remain pixel-identical**
- Corner radius, padding, gradient direction, gradient colors — all unchanged

This icon is the brand's visual anchor. It is locked. Do not redesign, recolor, or alter it in any way. It will also be used as the standalone app icon and favicon.

### The "Sý" portion of the wordmark

- The large serif "Sý" on the right side of the existing logo — same typography, same weight, same color (dark navy / near-black), same diacritic placement
- **Do NOT redraw, retypeset, or modernize.** Preserve the original "Sý" exactly as it appears in the existing PNG.

### The "Learning" subtitle

- The smaller "Learning" text that currently appears below "Sýnesis" — **keep it exactly as it is.** Same font, same weight, same color, same size, same position.

### The thin-line tagline treatment

- The thin horizontal lines on either side of the bottom tagline — same length, same weight, same color, same position.

---

## What changes

### Change #1 — Delete "nesis" from the wordmark

The current wordmark reads "**Sýnesis**" with "Learning" below it. Simply remove the "nesis" portion of "Sýnesis," leaving just "Sý" on top and "Learning" below.

- Before: **Sýnesis** / Learning
- After: **Sý** / Learning

This produces a vertically stacked wordmark: large "Sý" on top, smaller "Learning" centered below. The visual relationship between the two words remains exactly what the existing design has — you're just removing three letters.

### Change #2 — Update the tagline text

The current tagline reads: **EDUCATION WOVEN TOGETHER**
The new tagline reads: **TOGETHER WE LEARN**

Same font, same size, same all-caps treatment, same color, same thin-line decoration on either side. Only the words change.

---

## Composition after the change

The final logo should look like:

```
┌────┐
│ Sý │   Sý
│    │   Learning
└────┘   ─── TOGETHER WE LEARN ───
```

Same horizontal layout as today (icon left, wordmark right), same proportions, same color palette. Just the wordmark text is now "Sý / Learning" instead of "Sýnesis / Learning," and the tagline reads "TOGETHER WE LEARN" instead of "EDUCATION WOVEN TOGETHER."

---

## Required deliverables

Provide all of these:

### Primary logo (horizontal — icon + wordmark)

- `sy-learning-logo-v6.png` — full color, transparent background, 2x retina, minimum 2000px wide
- `sy-learning-logo-v6.svg` — vector source if possible (for infinite scaling)
- `sy-learning-logo-v6-dark.png` — version that works on dark backgrounds (wordmark in white instead of navy, icon unchanged)

### Icon-only mark (the rounded square with Sý inside)

- `sy-learning-icon-v6.png` — 1024x1024 transparent background
- `sy-learning-icon-v6.svg` — vector source if possible

### Favicons (for browser tabs and mobile app icons)

- `favicon-16.png` — 16x16
- `favicon-32.png` — 32x32
- `favicon-180.png` — 180x180 (Apple touch icon)
- `favicon-512.png` — 512x512 (Android/PWA)

### Social media variants (optional but useful)

- `og-image-1200x630.png` — Open Graph card for link previews on Twitter/LinkedIn/Facebook/iMessage
- `social-square-1080.png` — 1080x1080 with icon centered + "Sý Learning" wordmark below + tagline

---

## Color reference

Pull exact hex values from the existing PNG when you sample. Reference values (approximate, confirm against source):

- Icon background gradient: dark navy `#1a1a3e` → purple `#3d2a6b` with blue `#4a5fc1` and orange `#d97842` accent ribbons
- White "Sý" inside icon: pure white `#ffffff`
- Wordmark "Sý" and "Learning": dark navy `#1a1a3e` (matches icon darkest gradient stop)
- Tagline "TOGETHER WE LEARN": navy `#3d4a8a` or matching dark color
- Tagline divider lines: same color as tagline text, thin (1px at 1x scale)

---

## Usage rules (for whoever updates the brand guide later)

- **Clear space:** Minimum padding equal to the height of the "S" in "Sý" on all sides of the full logo.
- **Minimum size:** Full horizontal logo should never appear smaller than 120px wide; icon-only should never appear smaller than 24px.
- **Never:** Stretch, recolor, rotate, add drop shadows, replace the typography, or extract the "Sý" from the icon background.
- **Backgrounds:** Use the dark-mode variant on backgrounds darker than 50% gray. Use the full-color variant on white/light backgrounds.

---

## Execution paths (pick one)

### Path A — Fiverr / 99designs designer ($20–$60, ~1–2 days)

Hand the designer this brief plus the existing `branding/synesis-logo-v5.png`. Most logo designers can do this in 30 minutes — it's a minor wordmark edit, not a redesign. Cheapest if you don't have design software.

Search Fiverr for "logo edit" or "logo wordmark update" — pick someone with portfolio examples of clean typographic work. Avoid designers who only show flashy 3D/AI-generated work; you want someone comfortable with type.

### Path B — Self-do in Canva or Photoshop (~30 min, free–$15)

If you have Canva Pro or Photoshop:
1. Open the existing PNG
2. Identify and erase the "nesis" portion using the eraser or content-aware fill
3. The space where "nesis" was should be transparent (it sits over white in the current design)
4. The "Learning" subtitle and tagline don't need to move — they stay where they are
5. Replace "EDUCATION WOVEN TOGETHER" by erasing it and typing "TOGETHER WE LEARN" in the same font (the existing PNG was likely made with a serif like Cinzel, Optima, Cormorant, or a custom font — match by eye)
6. Export at all the sizes listed above

### Path C — AI image generation (fast, lower fidelity)

Use ChatGPT's image tool, Adobe Firefly, or Midjourney with a prompt like:

> "Edit the attached logo. Keep the icon mark on the left (purple square with white Sý and wave pattern) exactly as it is. In the wordmark on the right, change 'Sýnesis' to read 'Sý' only — delete the letters 'nesis' and leave 'Sý' centered above the existing 'Learning' text. Change the bottom tagline from 'EDUCATION WOVEN TOGETHER' to 'TOGETHER WE LEARN' using the same font and same line decoration. Preserve all colors, typography, spacing, and proportions."

Caveat: AI image tools are unreliable for precise typography work. Expect 3–5 iterations. Don't ship the result without a human review pass.

### Path D — Codex / Python with Pillow

Codex can do simple raster manipulation (erasing pixel regions, pasting new text rendered from a font file). But matching the exact serif used in the original requires either the source font file or close visual approximation. This is doable but lower-fidelity than a human designer; reserve for if you're already in Codex and want to try a draft.

---

## My recommendation

**Path A (Fiverr).** $30–$60, one day, professional result, you get all the deliverables in one pass. The other paths either cost time (Path B) or quality (Path C/D). For a brand element this central, paying a small fee for a clean output is worth it.

If you want to attempt Path B yourself first, that's also fine — the change is small enough that a Canva-comfortable user can land it. Just don't ship anything you wouldn't put on a billboard.

---

## After you have the new files

1. Drop them into `/branding/` (and `/public/branding/` for the production-served versions)
2. Tell me the filenames you used
3. I'll update the Phase 1 Codex spec to reference the new filenames so Codex wires the *correct* PNG into the header, not the old "Sýnesis" one
