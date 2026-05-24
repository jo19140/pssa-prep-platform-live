export const SERVICE_RETENTION_DAYS = 90;
export const DEFAULT_RETENTION_TIER = "SERVICE" as const;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function defaultRetention(startedAt: Date) {
  return {
    retentionTier: DEFAULT_RETENTION_TIER,
    deleteAfterDate: addDays(startedAt, SERVICE_RETENTION_DAYS),
  };
}
