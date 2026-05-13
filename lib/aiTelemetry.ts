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
const globalTelemetry = globalThis as typeof globalThis & {
  __aiFailureCounters?: Map<string, number>;
  __aiLastFailures?: AiFailureLog[];
};
const sharedCounters = globalTelemetry.__aiFailureCounters || counters;
const sharedLastFailures = globalTelemetry.__aiLastFailures || lastFailures;
globalTelemetry.__aiFailureCounters = sharedCounters;
globalTelemetry.__aiLastFailures = sharedLastFailures;

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

  sharedCounters.set(scope, (sharedCounters.get(scope) || 0) + 1);
  sharedLastFailures.unshift(entry);
  if (sharedLastFailures.length > MAX_FAILURES) sharedLastFailures.length = MAX_FAILURES;

  console.error(JSON.stringify(entry));
}

export function getAiFailureCounters() {
  return Object.fromEntries(sharedCounters.entries());
}

export function getLastAiFailures() {
  return [...sharedLastFailures];
}
