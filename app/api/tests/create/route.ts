import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      success: true,
      message: "Test create route is working",
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create test" },
      { status: 500 }
    );
  }
}