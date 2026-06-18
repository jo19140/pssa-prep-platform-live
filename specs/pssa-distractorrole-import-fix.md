# PSSA distractorRole import fix

Phase A durable fix: preserve authored distractorRole metadata through the PSSA responseSpecJson pipeline without changing Prisma schema.

Root cause: authoring can produce role-bearing choice objects, but the import response spec flattened MCQ choices to `string[]`, so `PssaItem.responseSpecJson` lost the `distractorRole` values read by Diagnostic Insights.

Scope:
- Introduce a shared production response-spec builder.
- Preserve legacy `choices: string[]` order exactly.
- Add `structuredChoicesJson: [{ text, distractorRole? }]` only for MCQ / conventions-as-MCQ items that already author roles.
- Never invent roles.
- Leave EBSR and non-choice item response specs unchanged.
- Add tests for complete distractor-role coverage, parity, student DTO security, and pure insight derivation.
- No Prisma migration and no dev backfill in Phase A.
