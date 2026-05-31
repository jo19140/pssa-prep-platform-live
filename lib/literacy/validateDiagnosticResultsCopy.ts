const forbiddenRules: Array<{ name: string; pattern: RegExp }> = [
  { name: "unsupported grade-level claim", pattern: /\b(above|below) grade level\b/i },
  { name: "unsupported norm-referenced claim", pattern: /\b(grade equivalent|percentile)\b/i },
  { name: "hedging language", pattern: /\b(might be|could be|we think|seems like)\b/i },
];

const controlledCodePattern = /^(?:[a-z]_[a-z]|PHASE_\d+(?:_[A-Z]+)?|diagnostic-results-v\d|[A-Z_]+|[a-z0-9]{8,}|[0-9a-f-]{16,})$/;

export type DiagnosticResultsCopyIssue = {
  path: string;
  text: string;
  reason: string;
};

export function validateDiagnosticResultsCopy(value: unknown) {
  const issues = findDiagnosticResultsCopyIssues(value);
  if (issues.length) {
    throw new Error(`Diagnostic results copy contains forbidden language: ${issues.map((issue) => `${issue.path} (${issue.reason})`).join(", ")}`);
  }
}

export function findDiagnosticResultsCopyIssues(value: unknown, path: string[] = []): DiagnosticResultsCopyIssue[] {
  const issues: DiagnosticResultsCopyIssue[] = [];
  if (typeof value === "string") {
    if (isNarrativePath(path) && !controlledCodePattern.test(value)) {
      for (const rule of forbiddenRules) {
        if (rule.pattern.test(value)) issues.push({ path: path.join("."), text: value, reason: rule.name });
      }
    }
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => issues.push(...findDiagnosticResultsCopyIssues(entry, [...path, String(index)])));
    return issues;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      issues.push(...findDiagnosticResultsCopyIssues(child, [...path, key]));
    }
  }
  return issues;
}

function isNarrativePath(path: string[]) {
  const last = path[path.length - 1] || "";
  if (["diagnosticSessionId", "resultSchemaVersion", "dailyTargetCode", "strand", "pattern", "itemId", "displayMode", "responseMode"].includes(last)) return false;
  if (path.includes("governance")) return last === "summary";
  return ["text", "interpretation", "reasoning", "additionalSupport", "phase", "placementBoundary", "label"].includes(last) || path.includes("parentFriendlySummary");
}
