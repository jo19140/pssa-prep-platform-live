import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = readEnvFiles([".env.local", ".env"]);
const nextAuthUrl = (process.env.NEXTAUTH_URL || env.NEXTAUTH_URL || "").trim().replace(/^['"]|['"]$/g, "");

if (process.env.NODE_ENV !== "production" && isProductionLookingUrl(nextAuthUrl)) {
  console.warn(
    `[dev-env] NEXTAUTH_URL is set to ${nextAuthUrl}. Local sign-in callbacks should use http://localhost:3000 during development.`,
  );
}

function readEnvFiles(files: string[]) {
  const parsed: Record<string, string> = {};
  for (const file of files) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || match[1].startsWith("#")) continue;
      parsed[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return parsed;
}

function isProductionLookingUrl(value: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return false;
    return url.protocol === "https:" || /\.(com|org|net|app|dev|edu)$/i.test(url.hostname);
  } catch {
    return false;
  }
}
