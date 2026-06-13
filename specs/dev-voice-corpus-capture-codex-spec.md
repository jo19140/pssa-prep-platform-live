# Codex spec — dev voice-corpus capture (local, parent-consented; NOT the production flywheel)

**Why:** Phase B showed off-the-shelf gpt-4o-transcribe false-negatives a correctly-read isolated word ~57% of the time for a 4–5-year-old. The only path past that is a corpus of real young-kid reading audio to fine-tune on — and the dev harness currently *drops* every clip. This adds a **dev-only, parent-consented, local-disk capture** so Jonathan's own consented test sessions stop evaporating. **This is NOT the production flywheel** (no cloud storage, no two-tier consent UI, no retention crons, no other users' children) — it's founder-owned dev corpus collection that can be imported into the real flywheel later.

## Scope / boundary

Add capture to the existing dev ASR harness. **Dev-only, admin-gated, prod-guarded (404 in production), no student route, no production DB write, no cloud.** Writes audio + a labeled manifest to **local disk only**. Capture is **OFF by default** — the existing process-and-drop behavior is unchanged unless the tester explicitly enables capture AND checks the parent-consent box. Files:
- `app/api/dev/voice-capture/route.ts` — new dev capture route.
- `app/dev/asr-check/page.tsx` — add the capture toggle + consent + age field; on Commit, when capture is on, POST the blob + row before dropping it.
- `.gitignore` — add the corpus dir so audio is NEVER committed.

## `app/api/dev/voice-capture/route.ts`

- POST `multipart/form-data`: the audio blob + a JSON `meta` field (the full row). Dev/admin-gated (`requireUser(["ADMIN"])`), `if (NODE_ENV === "production") return 404`.
- **Hard consent gate:** reject (400) unless `meta.consent === "parent-dev"`. Never write audio without it.
- Resolve corpus dir from env `VOICE_CORPUS_DIR` (default `./voice-corpus`); `mkdir -p` it. Write the audio bytes to `{dir}/audio/{utteranceId}.webm` and **append** one JSON line to `{dir}/manifest.jsonl`.
- Return `{ saved: true, audioFile, manifestPath }`. On any error return `{ saved: false, error }` (the page must not lose the row — it still appends to the on-screen table even if disk capture fails).

## Manifest line (JSONL — mirror `LabeledVoiceSegment` for later flywheel import)

One line per captured commit:
```
{ utteranceId, capturedAt, audioFile, consent: "parent-dev", phase, surfaceType,
  expectedText (= screenTarget), humanTranscript (= humanHeardAs), humanTranscript2 (= humanHeardAs2),
  asrVendor (= model), asrTranscript (= whisper_transcript), webspeechTranscript,
  asrConfidenceProxy, uncertaintyScore,
  falseCreditTranscribe, falseNegativeTranscribe, falseCreditWebSpeech, falseNegativeWebSpeech,
  speakerAgeBand, groundTruthSource, audioQualityNote }
```
Field names chosen so a later importer maps cleanly to `LabeledVoiceSegment` (`expectedText`, `humanTranscript`, `asrTranscript`, `uncertaintyScore`, `asrVendor`). `speakerAgeBand` is **new and valuable** — the whole point is young voices.

**Also include `targetPattern`** (the reading skill the word teaches), sourced from the corpus item — for the current a_e probe corpus this is `"a_e"`; leave blank if unknown. One field, additive only. Rationale: the eventual verifier checks a *skill* (silent-e, VCe→closed miscues like cape→cap), not just one word, and you can't retro-tag the skill onto audio captured without it. Do NOT add any further schema beyond `expectedText` + `targetPattern` for this probe — keep it minimal.

## `app/dev/asr-check/page.tsx` additions

- A **Capture** section: a checkbox **"Capture mode (save audio to local corpus)"** (default OFF), a checkbox **"I am the parent/guardian of the child being recorded and consent to storing this audio for model improvement"** (the consent gate), and a **"Reader age"** input (`speakerAgeBand`, e.g. `4`, `5`).
- On **Commit**, after finalizing the row: **if capture is on AND consent is checked**, POST the audio blob + the finalized row (with `consent:"parent-dev"`, `speakerAgeBand`) to `/api/dev/voice-capture` BEFORE revoking/dropping the blob; show a small "saved to corpus ✓" (or "capture failed — row kept" on error). **If capture is off OR consent unchecked, behavior is exactly as today (drop the blob, no write).**
- Commit must stay disabled until `humanHeardAs` is labeled (unchanged) — so every captured clip is a *labeled* segment.

## Privacy / honesty (state these in code comments + the report)

- Founder-owned, dev-only corpus collection of the founder's **own** children with the founder's parental consent. **Not** production: real users require the two-tier consent UI + secure cloud storage + retention crons (a separate effort), which this does NOT build.
- Audio is stored **unencrypted on the local dev machine** — acceptable for this consented dev data, NOT for production/other users. The corpus dir is **gitignored** (audio never enters version control).
- Capture defaults OFF; the process-and-drop default is preserved.

## Verification

`npx tsc --noEmit` · `npm run build`. Manual: with capture OFF, commit a row → no file written (process-and-drop unchanged). With capture ON + consent checked + age set, commit → `voice-corpus/audio/{id}.webm` exists and `voice-corpus/manifest.jsonl` gained one line with the labeled fields; with capture ON but consent UNchecked, the route rejects (no write) and the row is still kept on-screen. Confirm `voice-corpus/` is gitignored. In production build, the route returns 404.

## Stop — report

Diff for the route + page + `.gitignore`; confirmation capture is OFF by default and process-and-drop is unchanged when off; the consent gate (no `parent-dev` → no write); a sample `manifest.jsonl` line + the saved audio path; confirmation the corpus dir is gitignored and the route is dev/admin/prod-404 gated. Do NOT add any production student route, cloud upload, or DB write.

## Hardening (Pro review — REQUIRED; supersedes anything looser above)

**Server owns all disk writes — explicit routes, not "the page appends."** A browser page can't write local disk; the server must. Three admin-gated, prod-404, local-only routes (no cloud, no DB, no `ModelDecision`):
- `POST /api/dev/voice-capture/consent` → append a consent record to `{dir}/consents.jsonl`, return `consentId`.
- `POST /api/dev/voice-capture/clip` → write audio + append manifest line (the capture route).
- `POST /api/dev/voice-capture/delete` → delete a child's data.

**Path sanitization (security — non-negotiable).** The clip route builds `{dir}/audio/{utteranceId}.webm` from a client string. Validate `utteranceId` is UUID-like (`^[0-9a-f-]{36}$`), reject slashes/dots/traversal. Reject (400) on invalid — never interpolate an untrusted string into a file path.

**Path containment (defense-in-depth — applies to ALL writes/deletes, not just audio).** Every filesystem path (`consents.jsonl`, `manifest.jsonl`, `deletions.jsonl`, `audio/*`) must be resolved under `VOICE_CORPUS_DIR` with `path.resolve` and rejected if the resolved path falls outside the corpus root. Do NOT rely on `utteranceId` validation alone for path safety.

**Consent text hash is server-derived.** `consentTextVersion` and `consentTextHash` come from server-side constants for `probe-consent-v1`, NOT from client input. Reject if either can't be produced. A client-supplied hash proves nothing — the hash must prove which text the *system* used.

**No identifying data in filenames or audio.** Filenames are `{utteranceId}.webm` only — never child label/age/word. Audio carries no parent/child identifiers. Manifest references `consentId` only; child label + age live in `consents.jsonl` keyed by `consentId`.

**Contact minimization.** Any parent contact (only if needed for deletion) lives in `consents.jsonl` ONLY — never in `manifest.jsonl` or audio metadata.

**Upload caps + MIME (v1 = webm only).** Cap size + duration even for dev. **For this patch accept `audio/webm` only and always write `{utteranceId}.webm`.** Do NOT accept other MIME types and save them as `.webm`. If `wav/mp4` support is ever added, derive the extension from the MIME type, write the matching extension, and record it in the manifest — never a mismatch.

**Retention field (recorded, not auto-enforced — be honest).** Consent record includes `retentionExpiresAt` (consent timestamp + the 24-month form retention). No cron in this dev probe, so it's a recorded expiry the manual `delete` action enforces — do not imply automatic purge that isn't built.

**Deletion keyed on `consentId` (authoritative).** `childLabel` is NOT unique, so delete by `consentId`; a `childLabel` matching multiple consents warns and requires the `consentId`. Delete removes matching audio files + manifest rows + the consent record (or marks deleted), then appends a `deletions.jsonl` line with `consentId`/`childLabel` only — NO full names.

**Reject expired consent.** `/clip` rejects (400, no write) if the matched consent's `retentionExpiresAt < now`, so the field is an enforced gate, not just metadata. (Note: this collapses "consent still valid for new capture" and "data past retention" into one clock — fine for this probe; separate them if it ever goes broader.)

**Consent text hash.** The consent record stores both `consentTextVersion` ("probe-consent-v1") AND `consentTextHash` (hash of the stored consent-text constant the parent agreed to), so a later wording change can't obscure which text was consented. Reject a consent session lacking either.

**Orphan-safe write.** If the audio write succeeds but the manifest append fails, delete the written audio before returning `{saved:false}` — never leave an audio clip with no manifest row.

**Deletion removes PII, not just a flag.** If a tombstone consent record is kept, strip `parentGuardianName` and any parent contact; `deletions.jsonl` keeps only `consentId`, `childLabel`, `deletedAt`, `reason` — no parent full name or contact.

**Parent contact is optional** and, if collected, appears ONLY in `consents.jsonl` — never in manifest rows, filenames, deletion logs, or audio metadata.

**Capture failure never breaks the measurement row.** If the disk write fails, the on-screen ASR row still appends (process-and-drop fallback).

**Branch, don't merge to main yet.** Build on a branch, audit the diff, run a capture session; merge only if keeping it as a maintained dev utility. Never let it drift into production routes.

## After this

Jonathan re-runs his 4–5-year-olds (capture on, consent checked, age set) → a labeled local corpus accumulates (audio + expected + what-they-said + transcripts + flags). That corpus (a) lets us actually *hear* the 57% failures and (b) is the seed for the real flywheel: when the production consent + storage PR lands, an importer maps `manifest.jsonl` → `LabeledVoiceSegment`. Separately, the production two-tier-consent + secure-storage flywheel PR remains its own deliberate effort.
