# PSSA PR #2 Model Decision Report

## Recommendation

Use **Option B: create new governed `PssaItem`, `PssaPassage`, `PssaLesson`, `PssaGenerationBatch`, `PssaReviewLog`, `PssaLinterRun`, and `PssaAuditResult` models**.

Stopping after this report would have been a valid successful outcome if the model direction were ambiguous. It is not ambiguous enough to stop: the current schemas make Option B the safest path.

## Reasoning

### DiagnosticItem Is Too Coupled To Literacy

`DiagnosticItem` is a content-v3 literacy diagnostic model. It is coupled to:

- `phasePositionId`
- `dailyTargetId`
- `strand`
- `phaseBand`
- `targetPattern`
- `wordType`
- `morphologyWave`
- `targetMorpheme`
- `placementEvidenceJson`
- `fluencyEvidenceJson`
- Reading Buddy / phonics routing helpers and student-ready checks

Those fields and helpers are appropriate for foundational literacy diagnostics, not Pennsylvania PSSA ELA assessment governance. Reusing `DiagnosticItem` would blur PSSA assessment modules with phase/daily-target literacy placement logic.

### AssessmentQuestion Is Too Generic And Polluted

`AssessmentQuestion` is the existing runtime assessment row:

- It has no `itemStatus`, `reviewStatus`, `licenseStatus`, `sourceType`, `alignmentStatus`, `approvalEligible`, `approvedAt`, or `reviewedBy`.
- It stores most item structure in generic `questionPayload` JSON.
- It is already populated by unsafe deterministic generated PSSA rows.
- Runtime routes currently hydrate legacy `AssessmentQuestion` rows directly for students.

Extending `AssessmentQuestion` would mix governed and legacy unsafe records in one table and make fail-closed runtime behavior harder to prove. The safer strategy is to preserve `AssessmentQuestion` for audit/reference while new PSSA runtime code reads only governed student-ready helpers.

## Runtime Routes That Must Switch To Governed Source

- `app/api/student/session/route.ts`: currently hydrates `assessment.questions` and `assessment.passages` for student runtime. For PA/ELA/PSSA assignments, it must use `getStudentReadyPssaItems()` and `getStudentReadyPssaPassages()` instead of raw legacy question rows.
- `app/api/test/start/route.ts`: creates sessions by `assessmentId`; this is acceptable as session metadata, but item delivery must happen through the governed helper in the session route.
- `app/api/test/answer/route.ts` and `app/api/test/submit/route.ts`: later PRs should be checked for scoring paths that read raw `AssessmentQuestion`. PR #2 focuses on fail-closed item delivery.

## Migration Risk

The migration is additive:

- Adds new enums.
- Adds new governed PSSA tables.
- Adds relation tables for PSSA lesson practice/exit-ticket items.
- Does not drop, rewrite, or migrate existing `AssessmentQuestion`, `AssessmentPassage`, or PSSA rows.

The main risk is introducing new Prisma models without generated client support. This is covered by `prisma validate`, `tsc --noEmit`, and `npm run build`.

## Rollback Plan

If the governed model direction changes, rollback is straightforward because existing production tables are untouched:

1. Revert code that imports or calls PSSA governance helpers.
2. Revert the additive migration before it is applied, or create a follow-up drop migration if it has already been applied in a non-production environment.
3. Keep legacy `AssessmentQuestion` content intact for audit/reference.

## Decision

Proceed with Option B. Do not migrate legacy generated PSSA content into active/student-ready status automatically. Keep all regenerated/generator work for PR #3/#4.
