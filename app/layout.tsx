import "./globals.css";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AppChromeHeader } from "@/components/AppChromeHeader";
import { LegalFooter } from "@/components/LegalFooter";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "PSSA Prep Platform",
  description: "Adaptive PSSA-style assessment platform",
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
  await headers();
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppChromeHeader />
          {children}
          <LegalFooter />
        </Providers>
      </body>
    </html>
  );
}
