import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = { ...process.env, ...readEnvFiles([".env.local", ".env"]) };
const databaseUrl = String(env.DATABASE_URL || "");

if (!isLocalDatabase(databaseUrl) && env.ALLOW_REMOTE_DEV_RESET !== "1") {
  console.error("[dev:reset] Refusing to reset a non-local DATABASE_URL.");
  console.error("[dev:reset] Point DATABASE_URL at a local Postgres database, or set ALLOW_REMOTE_DEV_RESET=1 intentionally.");
  process.exit(1);
}

run("npx", ["prisma", "migrate", "reset", "--force", "--skip-generate", "--skip-seed"]);
run("tsx", ["prisma/seed-smoke-test.ts"]);

const dev = spawn("npm", ["run", "dev"], { stdio: "inherit", env });
dev.on("exit", (code) => process.exit(code || 0));

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status || 1);
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

function isLocalDatabase(url: string) {
  return /localhost|127\.0\.0\.1|::1/.test(url);
}
