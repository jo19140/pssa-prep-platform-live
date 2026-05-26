import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppChromeHeader } from "@/components/AppChromeHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://sylearning.com"),
  title: {
    default: "Sý Learning · Together We Learn",
    template: "%s · Sý Learning",
  },
  description: "An AI-powered standards-based mastery and intervention platform for grades 3-8.",
  icons: {
    icon: [
      { url: "/branding/favicon-32.png", sizes: "32x32" },
      { url: "/branding/favicon-16.png", sizes: "16x16" },
      { url: "/branding/favicon-512.png", sizes: "512x512" },
    ],
    apple: "/branding/favicon-180.png",
  },
  openGraph: {
    title: "Sý Learning · Together We Learn",
    description: "An AI-powered standards-based mastery and intervention platform for grades 3-8.",
    url: "https://sylearning.com",
    siteName: "Sý Learning",
    images: [{ url: "/branding/og-image-1200x630.png", width: 1200, height: 630 }],
  },
};

// Force every page through dynamic rendering so the per-request CSP nonce
// emitted by middleware.ts can be threaded onto Next.js's auto-generated
// <script> tags. Without this, pages like /login are statically prerendered
// at build time, the HTML's <script> tags have no nonce attribute, and the
// CSP's 'strict-dynamic' source rejects every Next chunk in the browser —
// React never hydrates and the login form falls back to a no-op native GET.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Reading headers() also marks this route segment as dynamic and, in Next 15,
  // causes Next.js to pick up the nonce from the request's Content-Security-Policy
  // header and attach it to every framework <script> tag it emits.
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") || "";
  const isSynesisRoute = [
    "/student/diagnostic",
    "/student/practice",
    "/student/speed-drill",
    "/teacher/literacy",
    "/parent/literacy",
    "/parent/settings/voice",
    "/onboarding/listening",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthSurface = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/parental-consent",
    "/data-request",
    "/legal",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isMarketingRoute = [
    "/",
    "/for-teachers",
    "/for-parents",
    "/for-schools",
    "/about",
    "/contact",
    "/faq",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          {!isSynesisRoute && !isAuthSurface && !isMarketingRoute ? <AppChromeHeader /> : null}
          {children}
          {!isAuthSurface && !isMarketingRoute ? <LegalFooter /> : null}
        </Providers>
      </body>
    </html>
  );
}
