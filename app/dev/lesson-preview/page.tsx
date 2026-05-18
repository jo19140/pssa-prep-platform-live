import { readFileSync, readdirSync } from "fs";
import path from "path";
import { LessonPreviewClient, type LessonPreviewSample } from "./LessonPreviewClient";

const SAMPLE_DIR = path.join(process.cwd(), "audit", "v2-samples");
const DEFAULT_SAMPLE = "sample-02-g3-verb-tense.json";

function loadSamples(): LessonPreviewSample[] {
  let filenames: string[] = [];
  try {
    filenames = readdirSync(SAMPLE_DIR)
      .filter((filename) => filename.endsWith(".json") && filename !== "summary.json")
      .sort();
  } catch {
    return [];
  }

  return filenames.flatMap((filename) => {
    try {
      const raw = JSON.parse(readFileSync(path.join(SAMPLE_DIR, filename), "utf8"));
      const lesson = raw.lesson;
      if (!lesson) return [];
      return [{
        filename,
        lesson,
        label: `${filename.replace(".json", "")}`,
        gradeLevel: Number(lesson.gradeLevel || 0),
        standardCode: String(lesson.standardCode || "Unknown standard"),
        skill: String(lesson.skill || "Unknown skill"),
        qualityScore: typeof lesson.qualityScore === "number" ? lesson.qualityScore : null,
        teiTypesUsed: Array.isArray(lesson.teiTypesUsed) ? lesson.teiTypesUsed : [],
      }];
    } catch {
      return [];
    }
  });
}

export default function LessonPreviewPage() {
  const samples = loadSamples();

  return (
    <main className="min-h-screen bg-slate-100">
      <LessonPreviewClient samples={samples} defaultFilename={DEFAULT_SAMPLE} />
    </main>
  );
}
