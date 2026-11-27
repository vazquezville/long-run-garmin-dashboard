const dayMs = 24 * 60 * 60 * 1000;

export interface DateRange {
  start: string;
  end: string;
}

// Local calendar date as YYYY-MM-DD
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toEpochDay(isoDate: string): number {
  return Math.round(Date.parse(`${isoDate}T00:00:00Z`) / dayMs);
}

function fromEpochDay(epochDay: number): string {
  return new Date(epochDay * dayMs).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return fromEpochDay(toEpochDay(isoDate) + days);
}

export function daysBetween(start: string, end: string): number {
  return toEpochDay(end) - toEpochDay(start);
}

export function lastDays(count: number, today: string): DateRange {
  return { start: addDays(today, 1 - count), end: today };
}

export function listDays({ start, end }: DateRange): string[] {
  return Array.from({ length: daysBetween(start, end) + 1 }, (_, index) => addDays(start, index));
}

// Windows are anchored to the epoch and may run up to limit, so cache keys stay stable
export function splitRange({ start, end }: DateRange, maxDays: number, limit: string = end): DateRange[] {
  const windows: DateRange[] = [];
  const limitDay = toEpochDay(limit);
  const lastDay = Math.min(toEpochDay(end), limitDay);
  for (let day = Math.floor(toEpochDay(start) / maxDays) * maxDays; day <= lastDay; day += maxDays) {
    windows.push({ start: fromEpochDay(day), end: fromEpochDay(Math.min(day + maxDays - 1, limitDay)) });
  }
  return windows;
}
