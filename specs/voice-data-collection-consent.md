# Voice-data collection — consent (frontier probe) + capture-record spec

**Status:** DRAFT. Lets you start collecting child reading audio *ethically* — including from kids who aren't yours. Two pieces: (1) the parental-consent **language** a parent agrees to, and (2) the per-session **consent record** that gates capture in the dev harness. **Not legal advice — see the legal caveat; get a COPPA-experienced attorney to review before any product or broad collection.**

## Scope: probe-level, not product

This covers the **frontier probe** (a small study with your own kids + consented family/friends' kids, ages ~5–8). It is NOT the production consent system — the product uses the already-built two-tier flow (`lib/voice/consent.ts`: Tier-1 service / Tier-2 training opt-in, COPPA-audited). The probe uses a lighter, per-session consent **record** stored alongside the local corpus.

## Two cases

- **Your own children:** you are the parent/legal guardian, so you can consent directly. Record relationship = `parent-self`. (This is the `parent-dev` path already in the capture spec — keep it.)
- **Anyone else's child:** you must capture the **actual parent/guardian's** consent first, with a record (who, relationship, child age, when, how). No consent record → no capture for that session. This is the new piece.

## The consent record (machine — gates capture)

Before any clip is captured in a session with a non-own child, store a consent record (in the corpus, e.g. `voice-corpus/consents.jsonl`, linked to clips by `consentId`/`sessionId`):

```
{ consentId, sessionId, recordedAt, recordedByUserId,
  parentGuardianName, relationship ("parent-self" | "parent" | "legal-guardian"),
  childLabel (first name or nickname ONLY — no full name), childAge,
  consentTextVersion, consentMethod ("in-person-signed" | "digital-acknowledged-present"),
  ipAddress? }
```

Capture is **blocked** for a session unless a valid consent record exists for it. The manifest's per-clip `consent` field references the `consentId` (replacing the bare `"parent-dev"` string for non-own kids).

## Parental consent language (DRAFT — attorney to review before product use)

> **Permission to record my child reading — Sý Learning (research preview)**
>
> Sý Learning is building a children's reading program where a friendly character, **Harper**, listens to a child read aloud and helps them. To make Harper better at understanding how young children read, we record short clips of children reading words and sentences.
>
> **What we collect:** short audio recordings of your child reading aloud, the words/sentences shown on screen, what your child said, and brief notes about the reading (for example, which sound was tricky). Recordings are tagged with your child's age and **first name or a nickname only**.
>
> **Why:** to measure and improve how accurately the program understands children reading, and to develop our reading-recognition technology.
>
> **How we protect it:** recordings are stored securely and used only to build and improve the reading program. We do **not** sell or share your child's recordings, and we do **not** publish them. We keep them until you ask us to delete them, or up to [retention period].
>
> **Your choices:** this is voluntary. You can stop at any time and ask us to delete your child's recordings — contact **[your email]**.
>
> By signing below, you confirm you are the **parent or legal guardian** of the child and you consent to the recording described above.
>
> Parent/guardian name: ______  Relationship: ______  Child's first name or nickname: ______  Child's age: ______  Date: ______  Signature: ______

`consentTextVersion`: `probe-consent-v1` (bump on any wording change; record which version each parent saw).

## Retention, deletion, access (probe corpus)

- Stored **locally**, securely, gitignored (`voice-corpus/`). Audio tagged with nickname + age only — **no full names, no full DOB, no contact info in filenames or metadata.**
- A parent can withdraw and request deletion at any time → delete that child's clips + manifest rows + consent record; log the deletion.
- Access limited to Jonathan (and any reviewer he designates). Do not post, share, or use beyond building/improving the reading recognizer.

## Legal caveat (read this)

I'm not a lawyer, and this is a starting draft, not vetted legal text. For a **small, in-person, informed probe** with parents you know who are present and consenting, a clear written consent + record is a reasonable basis. **Before the product, or any broader/remote collection, have a COPPA-experienced attorney review the consent flow + language** — the FTC treats a child's voice recording as personal information, and verifiable parental consent has specific accepted methods. If any collection ever happens **in a school/classroom context, FERPA may also apply** (and remember the standing constraint: do not run this through your own PA district). The voice-data-flywheel spec already budgeted ~$1–2K for this attorney review — worth it before scale.

## Codex addition (extend the dev capture harness)

Building on `specs/dev-voice-corpus-capture-codex-spec.md`, add to `/dev/asr-check` (still dev-only, admin-gated, prod-404, local-disk only):
- A **"New consent session"** control that records the consent fields above → writes a consent record to `voice-corpus/consents.jsonl`, returns a `consentId`, and sets it as the active session's consent. Relationship defaults to `parent-self` for your own kids; for others, all fields required.
- **Capture is blocked unless an active `consentId` exists for the session.** The capture route rejects (400) any clip whose `meta.consentId` has no matching consent record.
- A **"Delete this child's data"** dev action: given a `consentId` (or childLabel), remove the matching audio files + manifest rows + consent record and append a deletion log line.
- No new student route, no cloud, no production DB — local files only, gitignored.

## After this

You can ethically run the frontier probe: create a consent session per child (your own = self-consent; others = the parent signs/acknowledges the form first), then capture. The clips become a consented, labeled corpus — the first real bricks of the moat — and the deletion path keeps you honest. Production-grade consent (the built two-tier flow + secure cloud storage + attorney-reviewed language) remains its own deliberate effort before launch.
