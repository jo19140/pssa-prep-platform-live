import { NextResponse } from "next/server";
import { enforceDataFlywheelRetention } from "@/lib/dataflywheel/retention";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await enforceDataFlywheelRetention();
  return NextResponse.json(result);
}
