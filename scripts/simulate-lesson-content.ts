import { readFileSync } from "fs";
import path from "path";

// We test against the deterministic content paths since they're the floor
// every student sees when AI is rejected or unavailable.

type TestCase = {
  label: string;
  gradeLevel: number;
  standardCode: string;
  skill: string;
};

const cases: TestCase[] = [
  { label: "Conventions: Punctuation", gradeLevel: 6, standardCode: "CC.1.4.6.F2", skill: "Punctuation" },
  { label: "Conventions: Subject-Verb Agreement", gradeLevel: 6, standardCode: "CC.1.4.6.F1", skill: "Subject-Verb Agreement" },
  { label: "Literary: Inference + Evidence", gradeLevel: 6, standardCode: "CC.1.3.6.B", skill: "Citing Textual Evidence for Inference" },
  { label: "Literary: Theme", gradeLevel: 6, standardCode: "CC.1.3.6.A", skill: "Theme" },
  { label: "Literary: Figurative Language", gradeLevel: 6, standardCode: "CC.1.3.6.F", skill: "Figurative Language" },
  { label: "Informational: Central Idea", gradeLevel: 6, standardCode: "CC.1.2.6.A", skill: "Central Idea" },
  { label: "Informational: Text Structure", gradeLevel: 6, standardCode: "CC.1.2.6.E", skill: "Text Structure" },
  { label: "Vocabulary: Context Clues", gradeLevel: 6, standardCode: "CC.1.3.6.F", skill: "Context Clues" },
  { label: "Vocabulary: Roots", gradeLevel: 6, standardCode: "CC.1.1.6.E", skill: "Greek and Latin Roots" },
  { label: "Grade 7 spot-check: Inference", gradeLevel: 7, standardCode: "CC.1.3.7.B", skill: "Inference" },
];

const catalogPath = path.join(process.cwd(), "data", "oer-videos.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as any;
const videos = (catalog.videos || []) as any[];

function findHeroVideo(gradeLevel: number, standardCode: string, skill: string) {
  const exact = videos.find((v) => v.grade_level === gradeLevel && (v.pa_core_tags || []).includes(standardCode) && (v.skill_name || "").toLowerCase().includes(skill.toLowerCase()));
  if (exact) return exact;
  const standardOnly = videos.find((v) => v.grade_level === gradeLevel && (v.pa_core_tags || []).includes(standardCode));
  if (standardOnly) return standardOnly;
  const skillOnly = videos.find((v) => v.grade_level === gradeLevel && (v.skill_name || "").toLowerCase().includes(skill.toLowerCase()));
  return skillOnly || null;
}

console.log("=".repeat(80));
console.log("LESSON CONTENT SIMULATION");
console.log("=".repeat(80));

for (const c of cases) {
  console.log("\n" + "─".repeat(80));
  console.log(`CASE: ${c.label}`);
  console.log(`  Grade ${c.gradeLevel} · ${c.standardCode} · ${c.skill}`);
  console.log("─".repeat(80));

  const hero = findHeroVideo(c.gradeLevel, c.standardCode, c.skill);
  if (hero) {
    console.log(`\n✓ HERO VIDEO MATCHED`);
    console.log(`  Title: ${hero.video_title}`);
    console.log(`  Channel: ${hero.channel_name}`);
    console.log(`  URL: ${hero.watch_url}`);
    console.log(`  Duration: ${hero.duration_seconds ? `${Math.round(hero.duration_seconds / 60)}m ${hero.duration_seconds % 60}s` : "unknown"}`);
  } else {
    console.log(`\n✗ NO HERO VIDEO — student would see lesson without embedded video`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("END SIMULATION");
console.log("=".repeat(80));
