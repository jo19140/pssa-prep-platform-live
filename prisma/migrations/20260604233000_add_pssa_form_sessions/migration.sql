-- PR D-impl-1: governed PSSA form session tables.
-- Additive only: new enums, new tables, indexes, FKs, and CHECK constraints scoped to these new tables.
-- Prisma cannot express PostgreSQL partial indexes or these CHECK constraints; preserve this raw SQL if migrations are squashed.

CREATE TYPE "PssaFormSessionStatus" AS ENUM ('in_progress', 'submitted', 'invalidated_midflight');
CREATE TYPE "PssaFormResponseScoreStatus" AS ENUM ('scored', 'pending_human_scoring', 'invalid_response');

CREATE TABLE "PssaFormSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "formContentHashAtStart" TEXT NOT NULL,
    "status" "PssaFormSessionStatus" NOT NULL DEFAULT 'in_progress',
    "currentPosition" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "totalPoints" INTEGER,
    "earnedPoints" INTEGER,
    "pendingHumanPoints" INTEGER,
    "invalidatedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaFormSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PssaFormResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "formItemId" TEXT NOT NULL,
    "positionSnapshot" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "responsePayloadJson" JSONB NOT NULL,
    "scoreStatus" "PssaFormResponseScoreStatus" NOT NULL,
    "pointsEarned" INTEGER,
    "maxPoints" INTEGER NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PssaFormResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PssaFormSession_userId_formId_submittedAt_idx" ON "PssaFormSession"("userId", "formId", "submittedAt");
CREATE INDEX "PssaFormSession_formId_status_idx" ON "PssaFormSession"("formId", "status");
CREATE UNIQUE INDEX "PssaFormSession_one_in_progress_per_user_form_idx"
  ON "PssaFormSession"("userId", "formId")
  WHERE "status" = 'in_progress';

CREATE UNIQUE INDEX "PssaFormResponse_sessionId_formItemId_key" ON "PssaFormResponse"("sessionId", "formItemId");
CREATE UNIQUE INDEX "PssaFormResponse_sessionId_positionSnapshot_key" ON "PssaFormResponse"("sessionId", "positionSnapshot");
CREATE INDEX "PssaFormResponse_sessionId_idx" ON "PssaFormResponse"("sessionId");
CREATE INDEX "PssaFormResponse_formItemId_idx" ON "PssaFormResponse"("formItemId");
CREATE INDEX "PssaFormResponse_itemId_idx" ON "PssaFormResponse"("itemId");

ALTER TABLE "PssaFormSession" ADD CONSTRAINT "PssaFormSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PssaFormSession" ADD CONSTRAINT "PssaFormSession_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PssaForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PssaFormResponse" ADD CONSTRAINT "PssaFormResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PssaFormSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PssaFormResponse" ADD CONSTRAINT "PssaFormResponse_formItemId_fkey" FOREIGN KEY ("formItemId") REFERENCES "PssaFormItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PssaFormResponse" ADD CONSTRAINT "PssaFormResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PssaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PssaFormResponse" ADD CONSTRAINT "PssaFormResponse_score_contract_check"
  CHECK (
    "maxPoints" >= 0
    AND (
      (
        "scoreStatus" = 'scored'
        AND "pointsEarned" IS NOT NULL
        AND "pointsEarned" >= 0
        AND "pointsEarned" <= "maxPoints"
      )
      OR (
        "scoreStatus" = 'pending_human_scoring'
        AND "pointsEarned" IS NULL
      )
      OR (
        "scoreStatus" = 'invalid_response'
        AND "pointsEarned" IS NOT NULL
        AND "pointsEarned" = 0
      )
    )
  );

ALTER TABLE "PssaFormSession" ADD CONSTRAINT "PssaFormSession_totals_check"
  CHECK (
    "currentPosition" >= 1
    AND ("totalPoints" IS NULL OR "totalPoints" >= 0)
    AND ("earnedPoints" IS NULL OR "earnedPoints" >= 0)
    AND ("pendingHumanPoints" IS NULL OR "pendingHumanPoints" >= 0)
    AND ("totalPoints" IS NULL OR "earnedPoints" IS NULL OR "earnedPoints" <= "totalPoints")
    AND ("totalPoints" IS NULL OR "pendingHumanPoints" IS NULL OR "pendingHumanPoints" <= "totalPoints")
  );
