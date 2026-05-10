import "./globals.css";
import type { ReactNode } from "react";
import { AppChromeHeader } from "@/components/AppChromeHeader";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "PSSA Prep Platform",
  description: "Adaptive PSSA-style assessment platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppChromeHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
