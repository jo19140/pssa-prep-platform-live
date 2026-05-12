import type { NextRequest } from "next/server";

export const GOOGLE_CLASSROOM_TOKEN_COOKIE = "google_classroom_token";
export const GOOGLE_CLASSROOM_STATE_COOKIE = "google_classroom_state";

export type GoogleClassroomToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
};

export function getGoogleClassroomConfig(req?: Request | NextRequest) {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
  const origin = req ? new URL(req.url).origin : process.env.NEXTAUTH_URL || "http://localhost:3001";
  const redirectUri = process.env.GOOGLE_CLASSROOM_REDIRECT_URI || `${origin}/api/teacher/google-classroom/callback`;
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
    missing: [
      !clientId ? "GOOGLE_CLASSROOM_CLIENT_ID" : "",
      !clientSecret ? "GOOGLE_CLASSROOM_CLIENT_SECRET" : "",
    ].filter(Boolean),
  };
}

export function encodeGoogleClassroomToken(token: GoogleClassroomToken) {
  return Buffer.from(JSON.stringify(token), "utf8").toString("base64url");
}

export function decodeGoogleClassroomToken(value?: string | null): GoogleClassroomToken | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!parsed?.access_token || !parsed?.expires_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeGoogleToken(raw: any): GoogleClassroomToken {
  return {
    access_token: String(raw.access_token || ""),
    refresh_token: raw.refresh_token ? String(raw.refresh_token) : undefined,
    expires_at: Date.now() + Math.max(60, Number(raw.expires_in || 3600)) * 1000,
    scope: raw.scope ? String(raw.scope) : undefined,
    token_type: raw.token_type ? String(raw.token_type) : undefined,
  };
}

export async function getValidGoogleClassroomToken(req: NextRequest) {
  const token = decodeGoogleClassroomToken(req.cookies.get(GOOGLE_CLASSROOM_TOKEN_COOKIE)?.value);
  if (!token) return { token: null, refreshedToken: null };
  if (token.expires_at > Date.now() + 60_000) return { token, refreshedToken: null };
  if (!token.refresh_token) return { token: null, refreshedToken: null };

  const config = getGoogleClassroomConfig(req);
  if (!config.configured) return { token: null, refreshedToken: null };
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return { token: null, refreshedToken: null };
  const refreshed = normalizeGoogleToken(await res.json());
  refreshed.refresh_token = token.refresh_token;
  return { token: refreshed, refreshedToken: refreshed };
}

export function setGoogleClassroomTokenCookie(response: any, token: GoogleClassroomToken) {
  response.cookies.set(GOOGLE_CLASSROOM_TOKEN_COOKIE, encodeGoogleClassroomToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}
