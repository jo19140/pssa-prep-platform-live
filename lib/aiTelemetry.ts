type AiFailureLog = {
  scope: string;
  error: string;
  stack?: string;
  contextKeys: string[];
  timestamp: string;
};

const counters = new Map<string, number>();
const lastFailures: AiFailureLog[] = [];
const MAX_FAILURES = 50;

export function logAiFailure({
  scope,
  error,
  context,
}: {
  scope: string;
  error: unknown;
  context?: Record<string, unknown>;
}) {
  const normalized = error instanceof Error ? error : new Error(String(error || "Unknown AI failure"));
  const entry: AiFailureLog = {
    scope,
    error: normalized.message,
    stack: normalized.stack,
    contextKeys: context ? Object.keys(context) : [],
    timestamp: new Date().toISOString(),
  };

  counters.set(scope, (counters.get(scope) || 0) + 1);
  lastFailures.unshift(entry);
  if (lastFailures.length > MAX_FAILURES) lastFailures.length = MAX_FAILURES;

  console.error(JSON.stringify(entry));
}

export function getAiFailureCounters() {
  return Object.fromEntries(counters.entries());
}

export function getLastAiFailures() {
  return [...lastFailures];
}
