import "./globals.css";
import type { ReactNode } from "react";
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
          <div className="flex justify-between p-4 bg-gray-100">
            <h1 className="font-bold">PSSA Platform</h1>
          </div>

          {children}
        </Providers>
      </body>
    </html>
  );
}