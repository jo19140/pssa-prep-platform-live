import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  GOOGLE_CLASSROOM_STATE_COOKIE,
  getGoogleClassroomConfig,
  normalizeGoogleToken,
  setGoogleClassroomTokenCookie,
} from "@/lib/googleClassroom";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  const role = (session.user as any).role;
  if (role !== "TEACHER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get(GOOGLE_CLASSROOM_STATE_COOKIE)?.value;
  const config = getGoogleClassroomConfig(req);
  if (!code || !state || state !== expectedState || !config.configured) {
    return NextResponse.redirect(new URL("/teacher?tab=import&google=connect-failed", req.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/teacher?tab=import&google=connect-failed", req.url));

  const response = NextResponse.redirect(new URL("/teacher?tab=import&google=connected", req.url));
  response.cookies.delete(GOOGLE_CLASSROOM_STATE_COOKIE);
  setGoogleClassroomTokenCookie(response, normalizeGoogleToken(await tokenRes.json()));
  return response;
}
