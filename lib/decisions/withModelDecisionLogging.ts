import { createHash } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { retentionForStudentEvent } from "@/lib/events/recordStudentEvent";
import type { DecisionType } from "./decisionTypes";

export type ModelProvider = "OPENAI" | "ANTHROPIC" | "FINE_TUNED_LLAMA" | "RULE_BASED" | "IN_HOUSE_CLASSIFIER" | "HEURISTIC";

export interface ModelDecisionContext {
  decisionType: DecisionType;
  modelProvider: ModelProvider;
  modelName: string;
  modelVersion?: string;
  promptKey?: string;
  inputContext: Record<string, unknown>;
  studentEventId?: string;
  parentDecisionId?: string;
  studentUserId?: string;
  occurredAt?: Date;
}

export interface ModelDecisionMetadata {
  inferenceMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export async function recordModelDecision<T>(
  ctx: ModelDecisionContext,
  fn: () => Promise<{ output: T; metadata?: Partial<ModelDecisionMetadata> }>,
): Promise<T> {
  const startedAt = Date.now();
  const result = await fn();
  const metadata = { inferenceMs: Date.now() - startedAt, ...(result.metadata || {}) };
  void persistModelDecision(ctx, result.output, metadata);
  return result.output;
}

export async function persistModelDecision<T>(
  ctx: ModelDecisionContext,
  output: T,
  metadata: Partial<ModelDecisionMetadata> = {},
) {
  try {
    const occurredAt = ctx.occurredAt || new Date();
    const studentUserId = ctx.studentUserId || await studentUserIdForEvent(ctx.studentEventId);
    const retention = studentUserId ? await retentionForStudentEvent(studentUserId, occurredAt) : { retentionTier: "SERVICE", deleteAfterDate: addDays(occurredAt, 90) };
    const decision = await db.modelDecision.create({
      data: {
        decisionType: ctx.decisionType,
        modelProvider: ctx.modelProvider,
        modelName: ctx.modelName,
        modelVersion: ctx.modelVersion,
        inputContextJson: ctx.inputContext as Prisma.InputJsonValue,
        inputHash: stableHash(ctx.inputContext),
        promptKey: ctx.promptKey,
        decisionJson: normalizeDecisionOutput(output) as Prisma.InputJsonValue,
        outputHash: stableHash(output),
        inferenceMs: metadata.inferenceMs,
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        costUsd: metadata.costUsd,
        studentEventId: ctx.studentEventId,
        parentDecisionId: ctx.parentDecisionId,
        retentionTier: retention.retentionTier,
        deleteAfterDate: retention.deleteAfterDate,
        occurredAt,
      },
    });
    return decision.id;
  } catch (error) {
    console.warn("Model decision capture failed", { decisionType: ctx.decisionType, modelName: ctx.modelName, error });
    return null;
  }
}

async function studentUserIdForEvent(studentEventId?: string) {
  if (!studentEventId) return null;
  const event = await db.studentEvent.findUnique({ where: { id: studentEventId }, select: { studentUserId: true } });
  return event?.studentUserId || null;
}

export function stableHash(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeDecisionOutput(output: unknown): unknown {
  if (output === undefined) return null;
  return output;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
