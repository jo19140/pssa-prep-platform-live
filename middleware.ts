import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/admin", "/teacher", "/student", "/parent"];

export default async function middleware(req: Request & { nextUrl: URL; url: string }) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])].join(" ");
  const connectSrc = [
    "'self'",
    "https://api.openai.com",
    "https://api.resend.com",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
    "https://classroom.googleapis.com",
    "https://www.googleapis.com",
    ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : []),
  ].join(" ");
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", csp);

  const pathname = req.nextUrl.pathname;
  // Pin the session cookie name explicitly so it matches what NextAuth sets
  // in production (HTTPS on Vercel always uses the __Secure- prefix), regardless
  // of how NEXTAUTH_URL is configured. Without this, a NEXTAUTH_URL like
  // "http://localhost:3001" makes getToken look for "next-auth.session-token"
  // while the handler actually sets "__Secure-next-auth.session-token", and
  // middleware silently fails to find the token -> the user gets bounced back
  // to /login after a successful sign-in.
  const isProduction = process.env.NODE_ENV === "production";
  const sessionCookieName = isProduction
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
  const token = await getToken({
    req: req as any,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName,
    secureCookie: isProduction,
  });
  const role = token?.role as string | undefined;
  const awaitingConsent = role === "STUDENT" && token?.parentalConsentRequired === true && !token?.parentalConsentAt;
  let response: NextResponse | null = null;

  if (isProtectedPath(pathname) && !token) {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (awaitingConsent && pathname.startsWith("/student") && pathname !== "/student/awaiting-consent") {
    response = NextResponse.redirect(new URL("/student/awaiting-consent", req.url));
  } else if (pathname.startsWith("/admin/voice/labeling") && role !== "ADMIN" && role !== "VOICE_ANNOTATOR") {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (pathname.startsWith("/admin") && role !== "ADMIN") {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") {
    response = NextResponse.redirect(new URL(role === "STUDENT" ? "/student" : "/login", req.url));
  } else if (pathname.startsWith("/student") && role !== "STUDENT" && role !== "ADMIN") {
    response = NextResponse.redirect(new URL(role === "TEACHER" ? "/teacher" : "/login", req.url));
  } else if (pathname.startsWith("/parent") && role !== "PARENT" && role !== "ADMIN") {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (pathname === "/student" && role === "STUDENT") {
    response = NextResponse.redirect(new URL("/student/practice", req.url));
  } else if (pathname === "/teacher" && role === "TEACHER") {
    response = NextResponse.redirect(new URL("/teacher/literacy", req.url));
  } else if (pathname === "/dashboard") {
    if (role === "ADMIN") response = NextResponse.redirect(new URL("/admin", req.url));
    else if (role === "TEACHER") response = NextResponse.redirect(new URL("/teacher/literacy", req.url));
    else if (role === "STUDENT") response = NextResponse.redirect(new URL("/student/practice", req.url));
    else if (role === "PARENT") response = NextResponse.redirect(new URL("/parent", req.url));
    else response = NextResponse.redirect(new URL("/login", req.url));
  }

  if (!response) {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function isProtectedPath(pathname: string) {
  if (pathname === "/student/awaiting-consent") return false;
  return pathname === "/dashboard" || protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
