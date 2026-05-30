import fs from "node:fs";
import path from "node:path";

const grades = [3, 4, 5, 6, 7, 8];
const failures: string[] = [];
const summary: Record<string, unknown>[] = [];

for (const grade of grades) {
  const dir = path.resolve(`exemplars/pssa_grade${grade}_pilot`);
  const files = ["pilot_student_preview.md", "pilot_backend.json", "pilot_answer_key_and_rubric.md", "pilot_audit_report.md"];
  for (const file of files) {
    if (!fs.existsSync(path.join(dir, file))) failures.push(`Grade ${grade} missing ${file}`);
  }
  if (!fs.existsSync(path.join(dir, "pilot_backend.json"))) continue;
  const backend = JSON.parse(fs.readFileSync(path.join(dir, "pilot_backend.json"), "utf8"));
  const audit = fs.existsSync(path.join(dir, "pilot_audit_report.md")) ? fs.readFileSync(path.join(dir, "pilot_audit_report.md"), "utf8") : "";
  if (!audit.includes("All gates PASS.")) failures.push(`Grade ${grade} audit report does not show all gates PASS`);
  summary.push({
    grade,
    passages: backend.passages.length,
    items: backend.items.length,
    mcq: backend.items.filter((item: any) => item.itemType === "MCQ").length,
    tda: backend.items.filter((item: any) => item.itemType === "TDA").length,
    distinctEc: new Set(backend.items.map((item: any) => item.eligibleContent)).size,
  });
}

if (!fs.existsSync(path.resolve("exemplars/pssa_pilot_batch_summary.md"))) {
  failures.push("Missing exemplars/pssa_pilot_batch_summary.md");
}

if (failures.length) {
  console.error(JSON.stringify({ result: "FAIL", failures, summary }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ result: "PASS", summary }, null, 2));
}
