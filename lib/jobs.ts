import { Client, Receiver } from "@upstash/qstash";
import { logAiFailure } from "@/lib/aiTelemetry";
import { db } from "@/lib/db";

export type AiJobType = "ESSAY_GRADING" | "LESSON_ENRICHMENT" | "LEARNING_PATH_ENRICHMENT";

export async function enqueueAiJob({
  sessionId,
  jobType,
  targetId = null,
}: {
  sessionId: string;
  jobType: AiJobType;
  targetId?: string | null;
}) {
  const existing = await db.aiJob.findFirst({ where: { sessionId, jobType, targetId } });
  const job =
    existing ||
    (await db.aiJob.create({
      data: { sessionId, jobType, targetId },
    }));

  if (!process.env.QSTASH_TOKEN) return processInline(job.id);

  const client = new Client({ token: process.env.QSTASH_TOKEN });
  try {
    await client.publishJSON({
      url: `${baseUrl()}/api/jobs/process-ai`,
      body: { jobId: job.id },
      deduplicationId: job.id,
    });
    return job;
  } catch (error) {
    logAiFailure({
      scope: "qstash.enqueue",
      error,
      context: { jobId: job.id, sessionId, jobType, targetId },
    });
    return processInline(job.id);
  }
}

async function processInline(jobId: string) {
  const { processAiJob } = await import("@/lib/aiJobProcessor");
  return processAiJob(jobId);
}

export async function verifyQstashSignature(req: Request, rawBody: string) {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) return true;
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  });
  try {
    return await receiver.verify({
      signature: req.headers.get("upstash-signature") || "",
      body: rawBody,
      url: req.url,
      upstashRegion: req.headers.get("upstash-region") || undefined,
      clockTolerance: 60,
    });
  } catch {
    return false;
  }
}

function baseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}
