import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    const role = token.role as string | undefined;

    if (pathname.startsWith("/admin") && role !== "ADMIN") return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/teacher") && role !== "TEACHER" && role !== "ADMIN") return NextResponse.redirect(new URL(role === "STUDENT" ? "/student" : "/login", req.url));
    if (pathname.startsWith("/student") && role !== "STUDENT" && role !== "ADMIN") return NextResponse.redirect(new URL(role === "TEACHER" ? "/teacher" : "/login", req.url));
    if (pathname.startsWith("/parent") && role !== "PARENT" && role !== "ADMIN") return NextResponse.redirect(new URL("/login", req.url));

    if (pathname === "/dashboard") {
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
      if (role === "TEACHER") return NextResponse.redirect(new URL("/teacher", req.url));
      if (role === "STUDENT") return NextResponse.redirect(new URL("/student", req.url));
      if (role === "PARENT") return NextResponse.redirect(new URL("/parent", req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = { matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*", "/dashboard"] };
