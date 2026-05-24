import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

const exportSchema = z.object({
  batchName: z.string().trim().min(3).max(120),
  exportPurpose: z.enum(["TRAINING", "EVAL", "RESEARCH", "DEBUG"]).default("DEBUG"),
  eventTypeFilter: z.array(z.string()).default([]),
  decisionTypeFilter: z.array(z.string()).default([]),
  dateRangeStart: z.string().optional(),
  dateRangeEnd: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET() {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const batches = await db.eventExportBatch.findMany({ orderBy: { exportedAt: "desc" }, take: 50 });
  return NextResponse.json({ batches });
}

export async function POST(req: Request) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const parsed = exportSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const body = parsed.data;
  const dateWhere = {
    gte: body.dateRangeStart ? new Date(body.dateRangeStart) : undefined,
    lte: body.dateRangeEnd ? new Date(body.dateRangeEnd) : undefined,
  };
  const trainingOnly = body.exportPurpose !== "DEBUG";
  const baseEventWhere: Prisma.StudentEventWhereInput = {
    ...(body.eventTypeFilter.length ? { eventType: { in: body.eventTypeFilter } } : {}),
    ...(body.dateRangeStart || body.dateRangeEnd ? { occurredAt: dateWhere } : {}),
  };
  const baseDecisionWhere: Prisma.ModelDecisionWhereInput = {
    ...(body.decisionTypeFilter.length ? { decisionType: { in: body.decisionTypeFilter } } : {}),
    ...(body.dateRangeStart || body.dateRangeEnd ? { occurredAt: dateWhere } : {}),
  };
  const eventWhere: Prisma.StudentEventWhereInput = { ...baseEventWhere, ...(trainingOnly ? { retentionTier: "TRAINING" } : {}) };
  const decisionWhere: Prisma.ModelDecisionWhereInput = { ...baseDecisionWhere, ...(trainingOnly ? { retentionTier: "TRAINING" } : {}) };
  const [events, decisions, excludedEvents, excludedDecisions] = await Promise.all([
    db.studentEvent.findMany({ where: eventWhere, take: 1000 }),
    db.modelDecision.findMany({ where: decisionWhere, take: 1000 }),
    trainingOnly ? db.studentEvent.count({ where: { ...baseEventWhere, retentionTier: { not: "TRAINING" } } }) : Promise.resolve(0),
    trainingOnly ? db.modelDecision.count({ where: { ...baseDecisionWhere, retentionTier: { not: "TRAINING" } } }) : Promise.resolve(0),
  ]);
  const manifestJsonl = [
    ...events.map((event) => JSON.stringify({ recordType: "StudentEvent", id: event.id, studentUserId: event.studentUserId, eventType: event.eventType, occurredAt: event.occurredAt, contextJson: event.contextJson, responseJson: event.responseJson, immediateOutcome: event.immediateOutcome })),
    ...decisions.map((decision) => JSON.stringify({ recordType: "ModelDecision", id: decision.id, decisionType: decision.decisionType, modelProvider: decision.modelProvider, modelName: decision.modelName, inputContextJson: decision.inputContextJson, promptKey: decision.promptKey, decisionJson: decision.decisionJson })),
  ].join("\n");
  const batch = await db.eventExportBatch.create({
    data: {
      batchName: body.batchName,
      exportPurpose: body.exportPurpose,
      eventCount: events.length,
      decisionCount: decisions.length,
      eventTypeFilter: body.eventTypeFilter,
      decisionTypeFilter: body.decisionTypeFilter,
      dateRangeStart: body.dateRangeStart ? new Date(body.dateRangeStart) : undefined,
      dateRangeEnd: body.dateRangeEnd ? new Date(body.dateRangeEnd) : undefined,
      consentTierMinimum: trainingOnly ? "TRAINING" : "SERVICE",
      excludedRecordCount: excludedEvents + excludedDecisions,
      manifestStorageKey: `event-export://${body.batchName}`,
      manifestJsonl,
      exportedByUserId: auth.user!.id,
      notes: body.notes,
    },
  });
  return NextResponse.json({ batch });
}
