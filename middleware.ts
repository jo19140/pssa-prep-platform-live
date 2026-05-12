import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPrefixes = ["/admin", "/teacher", "/student", "/parent"];

export default async function middleware(req: Request & { nextUrl: URL; url: string }) {
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://api.resend.com https://accounts.google.com https://oauth2.googleapis.com https://classroom.googleapis.com https://www.googleapis.com",
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const pathname = req.nextUrl.pathname;
  const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
  const role = token?.role as string | undefined;
  let response: NextResponse | null = null;

  if (isProtectedPath(pathname) && !token) {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (pathname.startsWith("/admin") && role !== "ADMIN") {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") {
    response = NextResponse.redirect(new URL(role === "STUDENT" ? "/student" : "/login", req.url));
  } else if (pathname.startsWith("/student") && role !== "STUDENT" && role !== "ADMIN") {
    response = NextResponse.redirect(new URL(role === "TEACHER" ? "/teacher" : "/login", req.url));
  } else if (pathname.startsWith("/parent") && role !== "PARENT" && role !== "ADMIN") {
    response = NextResponse.redirect(new URL("/login", req.url));
  } else if (pathname === "/dashboard") {
    if (role === "ADMIN") response = NextResponse.redirect(new URL("/admin", req.url));
    else if (role === "TEACHER") response = NextResponse.redirect(new URL("/teacher", req.url));
    else if (role === "STUDENT") response = NextResponse.redirect(new URL("/student", req.url));
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
  return pathname === "/dashboard" || protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
