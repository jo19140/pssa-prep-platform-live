# Project Sýnesis — Brand Decision

**Status:** Working reference for product, design, and Codex agents
**Last updated:** 2026-05-24
**Authoritative companion:** `branding/trademark-attorney-email.md` (legal intake), `branding/` (logo concepts and final wordmark assets)

This document captures the brand decisions that govern naming, identity, and product family architecture for the company. It is referenced by `PRODUCT_VISION.md`, `AGENTS.md`, and `specs/reading-buddy-v1-codex-spec.md`.

---

## Company Name

- **Formal:** Sýnesis Learning
- **Display:** Sýnesis (with acute accent on the ý)
- **Legal wordmark filing:** "Synesis Learning" / "Synesis" (USPTO normalizes diacritics)
- **Pronunciation:** "SIN-eh-sis" (greek root συνεσις — "understanding, insight, the bringing together of knowledge")
- **Tagline:** **Learning Woven Together**
- **Domain:** `synesislearning.com` (being secured 2026-05)
- **Filename / URL / code convention:** plain `Synesis` / `synesis` — no accent in identifiers, accent in display only

## Trademark Status

- **Classes targeted:** 041 (educational services), 009 (downloadable educational software)
- **Filing basis:** Intent-to-use (1(b))
- **Known prior registration:** USPTO serial 79418905, "SYNESIS" in Class 042 (biotech/scientific research), registered 2026-04-14. Coexistence likely viable on industry separation.
- **Attorney engagement:** Pending. See `branding/trademark-attorney-email.md` for intake draft (recommended firm: Gerben Law).
- **Filing strategy:** Likely "Sýnesis Learning" (qualified) primary, with "Sýnesis" (unqualified) as a defensive variant — final call pending attorney opinion.

## Product Family Architecture

Sýnesis is the parent brand. Subject programs are named "X Buddy" and assigned a planet:

| Program | Planet | Status | Subject |
|---|---|---|---|
| **Reading Buddy** | **Venus** | Flagship, v1 in flight | Literacy intervention K-8 |
| Math Buddy | Mercury | Future | Math |
| Science Buddy | Mars | Future | Science |
| History/Social Studies Buddy | Earth | Future | History / Social Studies |

State test prep is a **sibling surface** to the planets — not a planet itself. It lives in a "Test Prep" dropdown in global chrome.

| Test Prep Module | State | Status |
|---|---|---|
| **PSSA** | Pennsylvania | Built (legacy from pre-rebrand work, preserved as the first module) |
| STAAR | Texas | Planned, demand-driven |
| FSA | Florida | Planned, demand-driven |
| MCAS | Massachusetts | Planned, demand-driven |

Demand for unbuilt state modules is captured through the "Request your state" form in the Test Prep dropdown (writes to the `StateRequests` model).

## Brand Voice & Copy Rules

- Use **"striving readers"** — never "struggling."
- Lead adult-facing literacy surfaces with **Ehri phase placement** as the headline metric; Lexile is a supporting tag.
- The product **never** uses race, ethnicity, or socioeconomic status as a field, derived signal, or analytics dimension.
- The Buddy character (animated companion in voice surfaces) is a friendly orb without a fixed proper name in v1. Component accepts a `name` prop defaulting to "Reading Buddy" so future branding can swap it. The Buddy lives *inside* a program, not at the Sýnesis level.

## Soft Rebrand Approach

We are in a **soft rebrand** during the Reading Buddy v1 build:

- **New routes** ship with Sýnesis chrome (`SynesisHeader`, `ProgramSwitcher`, `TestPrepDropdown`).
- **Legacy PSSA-Platform routes** keep their existing branding and `AppChromeHeader`.
- A one-time **MigrationBanner** appears for pre-launch PA users on first post-launch login, reassuring them that PSSA work is preserved under the Test Prep tab.
- Full app-wide rebrand from "PSSA Prep Platform" → Sýnesis is **deferred to a separate hard-rebrand spec**.

Inventory of legacy surfaces still carrying PSSA branding is in `AGENTS.md` for the future hard-rebrand pass.

## Visual Identity

- **Logo concepts** (in `branding/`): wordmark (concept 1), convergence (concept 2), orbit (concept 3), lattice (concept 4). Working assets `synesis-logo-v5.png` and `synesis-icon-v5.png`.
- **Color themes per planet:** each planet tile carries its own theme via a `colorTheme` config. Venus = warm amber.
- **Wordmark final assets:** SVG to come from designer; v5 PNGs are interim.

## Go-to-Market

- **Initial deployment:** direct-to-family parent-pay subscription.
- **Then:** school and district licensing.
- **PA transition:** PSSA test-prep functionality preserved for Pennsylvania customers throughout the rebrand.
- **National positioning:** general literacy product expanding via additional state Test Prep modules (demand-driven via `StateRequests`).

## Open Items

- Final SVG wordmark from designer.
- Attorney engagement and clearance opinion.
- Domain DNS pointed to production once Reading Buddy v1 ships.
- Decision on filing "Sýnesis Learning" alone vs. with defensive variants — awaits attorney input.
