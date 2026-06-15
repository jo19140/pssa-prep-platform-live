# Capture Layer 1 — private Vercel Blob upload route (Codex spec)

**Date:** 2026-06-14 · Foundation: `capture-foundation-plan.md` · Verified against `origin/main` (`caee276`).
**STATUS: IMPLEMENTED + audited (`3c22323`, 2026-06-14) — mergeable.** All hardening points present (private `access`, voice-token isolation + fail-closed, `audioStorageKey`=pathname reference, contentType required, MIME→ext map, target-student consent never admin's, same-origin+rate-limit, private-read + ownership-prefix IDOR fix, delete via voice token). Verified by `tsc`/`build`/static test. Remaining: one **runtime smoke test** once the private store + `VOICE_BLOB_READ_WRITE_TOKEN` are provisioned (consented upload → lands in private store → reads back via serving route; un-consented → 403).

**Goal:** build the missing **upload** half of the voice-storage layer — a consent-gated route that stores a child's reading-attempt audio in a **PRIVATE** Vercel Blob store and returns the `audioStorageKey`. This is the counterpart to the already-wired `deleteVoiceAudioObject`. No player wiring yet (that's Layer 2).

## Manual prerequisite (Jonathan, in the Vercel dashboard — Codex cannot do this)
1. Create a **PRIVATE** Vercel Blob store (separate from the existing public store).
2. Add its read-write token to env as **`VOICE_BLOB_READ_WRITE_TOKEN`** (do NOT reuse the public `BLOB_READ_WRITE_TOKEN`).
3. Add the same var to `.env.example` (placeholder, no secret).

## What Codex builds

### 1. `lib/voice/storage.ts` — add the upload helper + isolate the voice token
- Add `addVoiceAudioObject(bytes: Buffer | ArrayBuffer | Blob, pathname: string, contentType: string): Promise<{ audioStorageKey: string; pathname: string }>`:
  - Use `@vercel/blob` `put(pathname, bytes, { access: "private", addRandomSuffix: true, token: process.env.VOICE_BLOB_READ_WRITE_TOKEN, contentType })`. (Installed `@vercel/blob` is `^2.3.3`, which supports private stores; confirm the exact option name against the SDK but it is `access: "private"` per Vercel docs.) **`contentType` is a required param — do not infer it from a raw `Buffer`.**
  - **`audioStorageKey` is a storage REFERENCE, not a signed/playable read URL.** Store the private blob pathname/key (or the `*.private.blob.vercel-storage.com` URL only if the serving + delete helpers resolve it correctly with the voice token). **Never return or store a signed public read URL from upload.**
  - **Fail closed:** if `VOICE_BLOB_READ_WRITE_TOKEN` is missing, throw a clear error; never fall back to the public store.
- Update `deleteVoiceAudioObject` to target the voice store: pass `{ token: process.env.VOICE_BLOB_READ_WRITE_TOKEN }` to `del(...)`, gate on `VOICE_BLOB_READ_WRITE_TOKEN`.
- **Audit + fix the READ/serving path (`app/api/voice/audio/session/[id]/route.ts`).** It currently does a naive `fetch(audioStorageKey)`, which returns 401 for a private blob. The voice read/proxy must use the **private** store — `get(...)`/signed read with `access:"private"` + `VOICE_BLOB_READ_WRITE_TOKEN`. **No voice put/get/del may use the public `BLOB_READ_WRITE_TOKEN`.**
- **Ownership defense-in-depth:** since pathnames are `voice/${studentUserId}/...`, the serving route should verify the `audioStorageKey` pathname prefix matches the session's student before streaming (closes the IDOR where a key points at another child's audio).

### 2. `app/api/voice/audio/upload/route.ts` — new, consent-gated
- `POST`, `requireUser(["STUDENT", "ADMIN"])`. **Require same-origin (Origin/Referer check), `multipart/form-data`, and a per-user rate limit** (authenticated file-upload endpoints are high-impact — mirror the rate-limit pattern used by the transcribe route).
- **Hard consent gate (the bedrock) — resolve the TARGET student precisely:**
  - If `auth.user.role === "STUDENT"`: `studentUserId = auth.user.id`.
  - If `auth.user.role === "ADMIN"`: require an explicit `studentUserId` in the body, and verify admin permission over that student. **Never check the admin's own consent.**
  - Load that student's active `VoiceConsent`; proceed **only if `trainingCorpusOptedIn === true`**. Otherwise **403 `{ error: "training_consent_required" }`, no `put()` call, store nothing.** Compute `retentionTier = TRAINING` server-side only after this check — **never trust a client-supplied `retentionTier`.**
- Accept the audio as `multipart/form-data` (a `Blob`/`File`) plus minimal JSON metadata (`surface`, `targetPattern`, `speakerAgeBand` — labels only, no transcript).
- Validate: MIME allowlist + size cap (≤ 5 MB) + non-empty. **MIME→extension map (no non-webm saved as `.webm`):** `audio/webm`→`.webm`, `audio/mp4`→`.mp4`, `audio/mpeg`→`.mp3`, `audio/wav`→`.wav`. (Safari/iOS may produce mp4/m4a, so support the map rather than webm-only.)
- Pathname: `voice/${studentUserId}/${crypto.randomUUID()}${extension}` (with `addRandomSuffix: true`).
- Call `addVoiceAudioObject(bytes, pathname, contentType)` → return `{ audioStorageKey }` (200). The caller (Layer 2) passes this key to the `voice-session` create route.
- **Do NOT** create the `VoiceSession` here. **Do NOT** write any `ModelDecision`, transcript, or raw text.

### 3. `.env.example`
- Add `VOICE_BLOB_READ_WRITE_TOKEN=` with a comment: private Blob store for children's voice; never reuse the public token.

## Acceptance / tests
- **Consent gate:** student **without** `trainingCorpusOptedIn` → 403, `put` **never called**, nothing stored. ADMIN upload checks the **target student's** consent, never the admin's.
- **Happy path:** student **with** `trainingCorpusOptedIn` → audio uploaded to the **private** store; returns a private `audioStorageKey` (not a public/signed read URL).
- **Privacy:** assert `access: "private"` is used, never `"public"`; all voice put/get/del use `VOICE_BLOB_READ_WRITE_TOKEN`, never `BLOB_READ_WRITE_TOKEN`.
- **MIME/extension:** an `audio/mp4` upload is stored with `.mp4`, not `.webm`; non-audio MIME or oversize → 400, no store.
- **Read path:** the serving route reads the private blob with the voice token (`access:"private"`) — a stored private clip is retrievable through the authed route, and the pathname-prefix ownership check rejects a key whose `studentUserId` segment ≠ the session's student.
- **Fail-closed:** missing `VOICE_BLOB_READ_WRITE_TOKEN` → clear error, no upload, no public-store fallback.
- **Hardening:** non-same-origin POST rejected; rate limit enforced per user.
- **Delete still works:** `deleteVoiceAudioObject`/`purgeVoiceSessionAudio` delete from the private store via the voice token.
- No `ModelDecision`/transcript/raw text written. `tsc --noEmit`, `npm run build` pass.

## Layer 2 invariant (flag now, enforce later)
When the player creates a `VoiceSession`, it must **not** trust an arbitrary client-supplied `audioStorageKey`. The key must come from the just-completed upload for that same authenticated student, or be validated by the `voice/${studentUserId}/...` pathname-prefix ownership. (Private storage protects the blob; the DB relation also needs ownership safety.)

## Do NOT
Use `access: "public"` for voice · reuse the public `BLOB_READ_WRITE_TOKEN` for any voice op · upload without target-student `trainingCorpusOptedIn` · check the admin's own consent · trust client `retentionTier` or arbitrary `audioStorageKey` · save non-webm audio as `.webm` · return a signed/public read URL from upload · create the `VoiceSession` here · store transcript/text/`ModelDecision` · wire the lesson player (Layer 2).

## Scope
Clean branch off `origin/main`. Touch only: `lib/voice/storage.ts`, `app/api/voice/audio/upload/route.ts` (new), `app/api/voice/audio/session/[id]/route.ts` (private-read token fix + ownership check), `.env.example`, and tests for the consent gate + private-access + MIME-extension + ownership-prefix.

## MANDATORY smoke test before merge + before Layer 2 (Jonathan, real env — code review can't prove the store/token is truly private)
1. Create the **private** Vercel Blob store; set `VOICE_BLOB_READ_WRITE_TOKEN`.
2. As a **consented** test student (`trainingCorpusOptedIn = true`), upload a tiny clip → 200.
3. Confirm the object lands in the **private** store (dashboard shows it under the private store, URL is `*.private.blob.vercel-storage.com`).
4. Confirm the returned `audioStorageKey` is a **pathname/reference**, not a public URL.
5. Confirm the serving route streams it **only when authorized**.
6. Confirm **another student cannot read it** (ownership-prefix → 404).
7. Confirm an **un-consented** student → **403 and no `put()`**.
8. Confirm **delete/purge** removes it from the private store.
Only after this passes: merge Layer 1, then write Layer 2.
