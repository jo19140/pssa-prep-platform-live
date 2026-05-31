import fs from "fs";
import path from "path";
import ts from "typescript";

const DEFAULT_ROOTS = ["components/literacy/diagnostic", "app/student/diagnostic"];
const KID_VISIBLE_PROPS = new Set(["label", "title", "aria-label", "placeholder", "helperText", "children"]);

export type DiagnosticCopyLintIssue = {
  file: string;
  line: number;
  text: string;
  reason: string;
};

const rules: Array<{ reason: string; pattern: RegExp; allow?: (text: string) => boolean }> = [
  {
    reason: "phoneme slash notation",
    pattern: /\/[a-zăĕĭŏŭāēīōūəæɑɔɛɪʊʃʒθðŋ]+\/?/i,
    allow: (text) => /\/(api|student|teacher|admin)\//.test(text) || /^https?:\/\//.test(text),
  },
  { reason: "phase label", pattern: /\bPhase\s+\d\b/i },
  { reason: "item counter", pattern: /\b\d+\s+of\s+\d+\b/i },
  { reason: "correctness feedback", pattern: /\b(that's right|right answer|correct answer|incorrect|wrong answer)\b/i },
  { reason: "timer language", pattern: /\b(seconds left|time's up|timer|countdown)\b/i },
];

export function lintDiagnosticUICopy(files = discoverFiles(DEFAULT_ROOTS)) {
  const issues: DiagnosticCopyLintIssue[] = [];
  for (const file of files) issues.push(...lintFile(file));
  return issues;
}

export function lintFile(file: string) {
  const sourceText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const issues: DiagnosticCopyLintIssue[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxText(node)) checkText(node.getText(source), node);
    if (ts.isStringLiteral(node) && (isKidVisibleAttribute(node) || isStringJsxChild(node))) checkText(node.text, node);
    if (ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression) && isKidVisibleAttribute(node.expression)) {
      checkText(node.expression.text, node.expression);
    }
    ts.forEachChild(node, visit);
  }

  function checkText(raw: string, node: ts.Node) {
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

function isKidVisibleAttribute(node: ts.Node) {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isJsxAttribute(current)) {
      const name = current.name.getText();
      return KID_VISIBLE_PROPS.has(name);
    }
    if (ts.isImportDeclaration(current) || ts.isCallExpression(current) || ts.isObjectLiteralExpression(current)) return false;
    current = current.parent;
  }
  return false;
}

function isStringJsxChild(node: ts.Node) {
  return ts.isJsxExpression(node.parent) && (ts.isJsxElement(node.parent.parent) || ts.isJsxFragment(node.parent.parent));
}

function discoverFiles(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    walk(root, files);
  }
  return files.filter((file) => file.endsWith(".tsx") && !file.endsWith("lint-diagnostic-ui-copy.ts"));
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
  const issues = cliFiles.length ? lintDiagnosticUICopy(cliFiles) : lintDiagnosticUICopy();
  if (issues.length) {
    for (const issue of issues) {
      console.error(`${issue.file}:${issue.line} ${issue.reason}: ${JSON.stringify(issue.text)}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Diagnostic kid-facing copy lint passed.");
  }
}
