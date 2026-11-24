export const DAY_MS = 86_400_000;

/** Plink #1 opened Monday 23 November 2026; a new box opens at 12:00 UTC. */
export const EPOCH_MS = Date.UTC(2026, 10, 23, 12);

export const dayNumber = (nowMs: number) =>
  Math.max(1, Math.floor((nowMs - EPOCH_MS) / DAY_MS) + 1);

export const dayStart = (day: number) => EPOCH_MS + (day - 1) * DAY_MS;

/** 0 = Monday ... 6 = Sunday. */
export const weekdayOf = (day: number) => (((day - 1) % 7) + 7) % 7;

export const WEEKDAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

export const weekdayLabel = (day: number) => WEEKDAYS[weekdayOf(day)] ?? 'Mon';
