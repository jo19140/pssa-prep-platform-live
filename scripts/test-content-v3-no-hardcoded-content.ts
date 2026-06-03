import assert from "assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const filesToScan = [
  "lib/literacy/lessonGenerator.ts",
  ...fs.readdirSync(path.join(repoRoot, "lib/literacy/lessonParts"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => `lib/literacy/lessonParts/${file}`),
];

const forbiddenPatterns = [
  /\bDave\b/,
  /\bJane\b/,
  /\bcake\b/i,
  /\blake\b/i,
  /Dave's Cake/,
  /\bcap\b/i,
  /\bcape\b/i,
  /\bDEMONSTRATION_PAIRS\b/,
  /\bSENTENCES\s*=/,
  /\bDICTATED_WORDS\b/,
  /\bQUESTIONS\s*=/,
  /\bLINE_2\b/,
  /\bLINE_3\b/,
];

const forbiddenMatchingPathPatterns = [
  /wordMatchesPattern\([^)]*ctx\.targetPattern\b/,
  /targetPatternCodes:\s*\[\s*ctx\.targetPattern\s*\]/,
  /validatePseudoword(?:Candidate|Set)\([^)]*ctx\.targetPattern\b/,
];

for (const relativePath of filesToScan) {
  const fullPath = path.join(repoRoot, relativePath);
  const contents = fs.readFileSync(fullPath, "utf8");
  for (const pattern of forbiddenPatterns) {
    assert(
      !pattern.test(contents),
      `${relativePath} contains hardcoded Phase 3 Entry fixture content matching ${pattern}. Move fixture content to lib/content/phase3EntryLessonContent.ts.`,
    );
  }
  for (const pattern of forbiddenMatchingPathPatterns) {
    assert(
      !pattern.test(contents),
      `${relativePath} uses ctx.targetPattern in a matching/validation path. Use ctx.targetPatterns or detectVcePattern instead.`,
    );
  }
}

console.log("content-v3 no hardcoded lesson fixture content checks passed");
