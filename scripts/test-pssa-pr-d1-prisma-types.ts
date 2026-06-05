import assert from "node:assert/strict";
import {
  Prisma,
  PssaFormResponseScoreStatus,
  PssaFormSessionStatus,
} from "@prisma/client";

assert.deepEqual(Object.values(PssaFormSessionStatus), [
  "in_progress",
  "submitted",
  "invalidated_midflight",
]);

assert.deepEqual(Object.values(PssaFormResponseScoreStatus), [
  "scored",
  "pending_human_scoring",
  "invalid_response",
]);

const pssaFormSessionCreateInput: Prisma.PssaFormSessionCreateInput = {
  formContentHashAtStart: "sha256:form-start",
  status: PssaFormSessionStatus.in_progress,
  currentPosition: 1,
  startedAt: new Date("2026-06-04T00:00:00.000Z"),
  submittedAt: null,
  totalPoints: null,
  earnedPoints: null,
  pendingHumanPoints: null,
  invalidatedReason: null,
  user: {
    connect: {
      id: "user_1",
    },
  },
  form: {
    connect: {
      id: "form_1",
    },
  },
};

const pssaFormResponseCreateInput: Prisma.PssaFormResponseCreateInput = {
  positionSnapshot: 1,
  responsePayloadJson: { selectedChoiceId: "choice_a" },
  scoreStatus: PssaFormResponseScoreStatus.scored,
  pointsEarned: 1,
  maxPoints: 1,
  detail: "machine_scored",
  session: {
    connect: {
      id: "session_1",
    },
  },
  formItem: {
    connect: {
      id: "form_item_1",
    },
  },
  item: {
    connect: {
      id: "item_1",
    },
  },
};

const requiredPrD1Fields = {
  formSessionStatus: pssaFormSessionCreateInput.status,
  formSessionUser: pssaFormSessionCreateInput.user,
  formSessionForm: pssaFormSessionCreateInput.form,
  formResponseScoreStatus: pssaFormResponseCreateInput.scoreStatus,
  formResponseSession: pssaFormResponseCreateInput.session,
  formResponseFormItem: pssaFormResponseCreateInput.formItem,
  formResponseItem: pssaFormResponseCreateInput.item,
};

void requiredPrD1Fields;
