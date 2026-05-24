import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["ADMIN"]);
  if (auth.error) return auth.error;
  const batch = await db.eventExportBatch.findUnique({ where: { id: (await params).id } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(batch.manifestJsonl, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="${batch.batchName}.jsonl"`,
      "cache-control": "private, no-store",
    },
  });
}
