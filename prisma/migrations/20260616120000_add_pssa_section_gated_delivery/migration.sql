-- PSSA Diagnostic Phase 3: additive section-progress state for section-gated delivery.
-- Existing flat sessions remain valid: section gating is activated only for sectioned forms.

ALTER TABLE "PssaFormSession"
  ADD COLUMN "currentSectionIndex" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "sectionStatusesJson" JSONB;

ALTER TABLE "PssaFormSession" ADD CONSTRAINT "PssaFormSession_current_section_check"
  CHECK ("currentSectionIndex" >= 1);
