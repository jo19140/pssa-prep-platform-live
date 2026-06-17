# P4A Synthetic Voice-Capture Smoke Checklist

Use this only for the synthetic grade-7 smoke account. The verifier is expected to fail until after the manual mic capture.

1. Seed the synthetic accounts:

   ```bash
   npm run seed:p4a-voice-smoke
   ```

   Credentials printed by the seed:

   - Student: `grade7-voice-smoke@example.com`
   - Voice annotator: `voice-annotator-smoke@example.com`
   - Password: `Password123!`

2. Start the app and log in as the synthetic student.

3. Open `/student/practice`.

4. Confirm the lesson is Coach Mode BAND_7_8 content, title `Jake at the Race`.

5. Go to Part 3 nonsense words and read one silly word aloud into the real mic so Harper marks it heard.

6. Before labeling, run the verifier:

   ```bash
   npm run test:p4a-voice-smoke
   ```

   It should find a queued `TRAINING` `LabeledVoiceSegment` with `asrTranscript=""`, `labeledAt=null`, an `a_e` expected pseudoword, and a private `voice/<studentUserId>/...` segment key.

7. Log out and log in as `voice-annotator-smoke@example.com`.

8. Open the voice labeling queue, select the captured pseudoword segment, and confirm audio streams through `/api/voice/audio/segment/[id]`.

9. Submit a label and confirm the segment leaves the queue.

Do not use this checklist for real student consent or production pilot setup.
