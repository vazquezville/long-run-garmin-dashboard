import { addDays, type DateRange } from "./garmin/ranges.ts";

// Months are identified as YYYY-MM and years as YYYY
export function monthRange(month: string): DateRange {
  const start = `${month}-01`;
  const nextMonth = `${addDays(start, 31).slice(0, 7)}-01`;
  return { start, end: addDays(nextMonth, -1) };
}

export const yearRange = (year: string): DateRange => ({ start: `${year}-01-01`, end: `${year}-12-31` });

// Drops the days that haven't happened yet
export const upTo = ({ start, end }: DateRange, today: string): DateRange => ({ start, end: end < today ? end : today });

// Months with activity plus the current one, oldest first
export function availableMonths(dates: string[], today: string): string[] {
  return [...new Set([...dates, today].map((date) => date.slice(0, 7)))].sort();
}

export const yearsOf = (months: string[]): string[] => [...new Set(months.map((month) => month.slice(0, 4)))];

export function adjacent(ids: string[], id: string): { previous: string | undefined; next: string | undefined } {
  const index = ids.indexOf(id);
  return { previous: ids[index - 1], next: index < 0 ? undefined : ids[index + 1] };
}

// Keeps the same month when changing year, or falls back to the latest one available
export function monthInYear(months: string[], year: string, monthNumber: string): string {
  const wanted = `${year}-${monthNumber}`;
  return months.includes(wanted) ? wanted : months.findLast((month) => month.startsWith(year))!;
}
