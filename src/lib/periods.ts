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
