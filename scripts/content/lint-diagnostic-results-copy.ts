import fs from "fs";
import path from "path";
import ts from "typescript";

const DEFAULT_ROOTS = [
  "components/literacy/diagnostic-results",
  "app/teacher/literacy/[studentId]/diagnostic",
  "app/parent/literacy/[childId]/diagnostic",
];

const rules: Array<{ reason: string; pattern: RegExp; allow?: (text: string) => boolean }> = [
  { reason: "unsupported grade-level claim", pattern: /\b(above|below) grade level\b/i },
  { reason: "unsupported norm-referenced claim", pattern: /\b(grade equivalent|percentile)\b/i },
  { reason: "hedging language", pattern: /\b(might be|could be|we think|seems like)\b/i },
];

export type DiagnosticResultsCopyLintIssue = { file: string; line: number; text: string; reason: string };

export function lintDiagnosticResultsCopy(files = discoverFiles(DEFAULT_ROOTS)) {
  return files.flatMap((file) => lintResultsFile(file));
}

export function lintResultsFile(file: string) {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const issues: DiagnosticResultsCopyLintIssue[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) check(node.getText(source), node);
    if (ts.isStringLiteral(node) && isVisibleString(node)) check(node.text, node);
    if (ts.isNoSubstitutionTemplateLiteral(node) && isVisibleString(node)) check(node.text, node);
    ts.forEachChild(node, visit);
  }

  function check(raw: string, node: ts.Node) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) return;
    for (const rule of rules) {
      if (rule.pattern.test(text) && !rule.allow?.(text)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        issues.push({ file, line: line + 1, text, reason: rule.reason });
      }
    }
  }

  visit(source);
  return issues;
}

function isVisibleString(node: ts.Node) {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isImportDeclaration(current) || ts.isObjectLiteralExpression(current) || ts.isTypeAliasDeclaration(current)) return false;
    if (ts.isJsxExpression(current) || ts.isJsxAttribute(current) || ts.isCallExpression(current) || ts.isReturnStatement(current)) return true;
    current = current.parent;
  }
  return false;
}

function discoverFiles(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    walk(root, files);
  }
  return files.filter((file) => file.endsWith(".tsx"));
}

function walk(dir: string, files: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
}

if (require.main === module) {
  const cliFiles = process.argv.slice(2).filter(Boolean);
  const issues = cliFiles.length ? lintDiagnosticResultsCopy(cliFiles) : lintDiagnosticResultsCopy();
  if (issues.length) {
    for (const issue of issues) console.error(`${issue.file}:${issue.line} ${issue.reason}: ${JSON.stringify(issue.text)}`);
    process.exitCode = 1;
  } else {
    console.log("Diagnostic adult-facing results copy lint passed.");
  }
}
