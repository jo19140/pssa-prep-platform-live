# Labeling flow completion — segment-level audio serving (Codex spec)

**Date:** 2026-06-14 · Verified against `origin/main` (`9a41bd3`).
**Context:** The voice-labeling flow is already built end-to-end (queue ordered by `uncertaintyScore`/`createdAt`, `LabelingWorkspace` UI, label POST with double-label inter-annotator-agreement QA, skip, eval-set promotion, corpus export). The new Layer 2 pseudoword segments auto-appear in the queue (`labeledAt = null`). **The one gap:** annotators can't hear them.

## The gap (confirmed)
`app/admin/voice/labeling/[segmentId]/page.tsx` passes `audioUrl={`/api/voice/audio/session/${segment.voiceSessionId}`}`. That route serves **`session.audioStorageKey`**, which is **null** for capture segments — their audio is at **`segment.segmentAudioKey`** (a private blob `voice/<studentId>/...`). So the `<audio>` element loads nothing. The corpus **export** route already handles this (`segment.segmentAudioKey || session.audioStorageKey`); only the **playback** path is missing.

## What Codex builds

### 1. New route `app/api/voice/audio/segment/[id]/route.ts`
Mirror `app/api/voice/audio/session/[id]/route.ts` (auth, access logging, private read), but resolve by **segment**:
- `GET`, `requireUser(["ADMIN","VOICE_ANNOTATOR"])`.
- Load the `LabeledVoiceSegment` by id, including `voiceSession.literacyProfile` (for `studentUserId`).
- **404** if not found, `segmentAudioKey` is null, or the owning session's `audioDeletedAt` is set (purged).
- **Access control — mirror the existing gate EXACTLY (do not invent a divergent predicate).** No shared eligibility helper exists; the queue route and session route both inline `{ labeledAt: null, skippedAt: null }`. So: ADMIN allowed; `VOICE_ANNOTATOR` allowed only if **`segment.labeledAt == null && segment.skippedAt == null`** (the segment is in queue); else 403. Do **not** add a `labeledByUserId === me` clause — it diverges from the session/queue predicate. (Known shared limitation: an annotator can't replay an already-labeled segment; if double-label QA review needs that later, change both routes together — out of scope here.)
- **`VOICE_ANNOTATOR` is an established string role** (used by the existing labeling routes/pages) — do **not** create or migrate a role. If Codex finds it is NOT a valid role, STOP and report rather than adding one in this PR.
- **Mirror the session route's streaming behavior/headers exactly** — stream `getVoiceAudioObject(...).stream`, `content-type` from the blob's contentType (fallback `audio/webm`), `cache-control: private, max-age=0, no-store`. (Matching it avoids subtle `<audio>` playback/seek issues; don't add range support unless a need appears.)
- Stream via the Layer 1 private helper `getVoiceAudioObject(segment.segmentAudioKey, segment.voiceSession.literacyProfile.studentUserId)` — enforces the `voice/${studentUserId}/` ownership prefix + private store + voice token. **Any ownership-prefix failure (key belongs to another student) → 404.**
- After auth/access checks pass, write a `voiceAudioAccessLog` row (`accessPurpose: "VOICE_AUDIO_READ"`) — include **both `voiceSessionId` and `segmentId`** (the schema already has a `segmentId String?` field + index; no migration).

### 2. Wire the labeling page
`app/admin/voice/labeling/[segmentId]/page.tsx`: build the audio URL to **prefer the segment route when there's a segment key**, falling back to the session route for legacy session-level audio:
```ts
const audioUrl = segment.segmentAudioKey
  ? `/api/voice/audio/segment/${segment.id}`
  : `/api/voice/audio/session/${segment.voiceSessionId}`;
```

## Acceptance / tests
- A `VOICE_ANNOTATOR` opening a **queued** pseudoword segment can **play** its audio (private blob streams through the new route).
- A purged/deleted segment (`segmentAudioKey` null or session `audioDeletedAt` set) → **404**, no stream.
- A non-admin / non-annotator → **403**; an annotator hitting a segment that is **not** `labeledAt==null && skippedAt==null` → **403** (matches the session/queue predicate).
- The route **never returns the raw private blob URL**; it uses `getVoiceAudioObject` only; any ownership-prefix failure → **404**.
- All voice reads use the **private** store + voice token (never the public `BLOB_READ_WRITE_TOKEN`, never `access:"public"`).
- **Cross-student IDOR test (explicit):** a segment whose `segmentAudioKey` is under `voice/<otherStudentId>/...` while the owning session's `literacyProfile.studentUserId` is `<studentA>` → GET returns **404** and does **not** stream (proves the ownership prefix actually fires).
- The `voiceAudioAccessLog` row is written **only after** auth/access checks pass, and includes `voiceSessionId` + `segmentId`. **403/404 responses write NO access-log row** (mirrors the session route, which logs only inside the post-access block).
- Streaming headers/behavior mirror the session route (content-type from blob, `no-store`).
- Existing session-audio playback (legacy session-level clips) still works via the fallback.
- `tsc --noEmit`, `npm run build` pass.

## Do NOT
Use the public `BLOB_READ_WRITE_TOKEN` or `access:"public"` for voice · serve a segment whose owning session is `audioDeletedAt` · bypass the `getVoiceAudioObject` ownership prefix check · change the labeling queue/label/skip/export logic · expose a raw blob URL to the client (stream through the route).

## Scope
Clean branch off `origin/main`. Touch only: `app/api/voice/audio/segment/[id]/route.ts` (new), `app/admin/voice/labeling/[segmentId]/page.tsx` (audioUrl), and a test for the access/404 rules.

## After this lands
The flywheel's second half is complete and end-to-end: capture (consented) → queue → **listen + label (transcript + miscue)** → double-label QA → eval-set → export manifest. Smoke: as a `VOICE_ANNOTATOR`, open the queue, play a captured pseudoword clip, submit a label, confirm `labeledAt`/`humanTranscript`/`miscueType` persist and it leaves the queue.
