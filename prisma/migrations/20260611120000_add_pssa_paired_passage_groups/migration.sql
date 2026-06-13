CREATE TABLE "PssaPassageGroup" (
  "id" TEXT NOT NULL,
  "gradeLevel" INTEGER NOT NULL,
  "subject" TEXT NOT NULL,
  "groupType" TEXT NOT NULL,
  "genre" TEXT NOT NULL,
  "staminaBand" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "wordCount" INTEGER NOT NULL,
  "domainVocabularyLoad" TEXT,
  "textFeaturesJson" JSONB,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PssaPassageGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PssaPassageGroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "passageId" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "passageContentHashSnapshot" TEXT NOT NULL,

  CONSTRAINT "PssaPassageGroupMember_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PssaItem"
  ADD COLUMN "passageGroupId" TEXT,
  ADD COLUMN "isCrossText" BOOLEAN,
  ADD COLUMN "requiredEvidenceSlotsJson" JSONB,
  ADD COLUMN "crossTextSupportRuleJson" JSONB;

CREATE UNIQUE INDEX "PssaPassageGroup_contentHash_key" ON "PssaPassageGroup"("contentHash");
CREATE INDEX "PssaPassageGroup_gradeLevel_groupType_idx" ON "PssaPassageGroup"("gradeLevel", "groupType");
CREATE INDEX "PssaPassageGroup_staminaBand_genre_idx" ON "PssaPassageGroup"("staminaBand", "genre");
CREATE UNIQUE INDEX "PssaPassageGroupMember_groupId_slot_key" ON "PssaPassageGroupMember"("groupId", "slot");
CREATE UNIQUE INDEX "PssaPassageGroupMember_groupId_passageId_key" ON "PssaPassageGroupMember"("groupId", "passageId");
CREATE INDEX "PssaPassageGroupMember_groupId_idx" ON "PssaPassageGroupMember"("groupId");
CREATE INDEX "PssaPassageGroupMember_passageId_idx" ON "PssaPassageGroupMember"("passageId");
CREATE INDEX "PssaItem_passageGroupId_idx" ON "PssaItem"("passageGroupId");

ALTER TABLE "PssaPassageGroupMember"
  ADD CONSTRAINT "PssaPassageGroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "PssaPassageGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PssaPassageGroupMember"
  ADD CONSTRAINT "PssaPassageGroupMember_passageId_fkey"
  FOREIGN KEY ("passageId") REFERENCES "PssaPassage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PssaItem"
  ADD CONSTRAINT "PssaItem_passageGroupId_fkey"
  FOREIGN KEY ("passageGroupId") REFERENCES "PssaPassageGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
