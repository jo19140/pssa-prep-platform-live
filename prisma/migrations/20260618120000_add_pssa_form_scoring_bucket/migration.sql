-- Phase 4A: analytics-only PSSA scoring support.
-- Additive only. Existing PssaFormSession totalPoints/earnedPoints/pendingHumanPoints
-- now mean operational-only totals; existing all-operational forms are behavior-preserved.

CREATE TYPE "PssaScoringBucket" AS ENUM ('operational', 'analytics_only');

ALTER TABLE "PssaFormItem"
ADD COLUMN "scoringBucket" "PssaScoringBucket" NOT NULL DEFAULT 'operational';

ALTER TABLE "PssaFormSession"
ADD COLUMN "analyticsTotalPoints" INTEGER,
ADD COLUMN "analyticsEarnedPoints" INTEGER,
ADD COLUMN "analyticsPendingHumanPoints" INTEGER;
