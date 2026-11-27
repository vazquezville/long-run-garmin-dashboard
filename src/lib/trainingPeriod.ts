import { weekStart } from "./data/aggregate.ts";
import { formatDay, formatFullDate, formatMonthName, formatMonthTitle, formatWeekday, formatWeekdayName } from "./format.ts";
import { addDays, daysBetween, lastDays, type DateRange } from "./garmin/ranges.ts";
import { monthRange, yearRange } from "./periods.ts";

export const periodModes = ["week", "month", "year", "days", "all"] as const;
export type PeriodMode = (typeof periodModes)[number];
type CalendarMode = Exclude<PeriodMode, "days" | "all">;

export const dayCountShortcuts = [7, 30, 90, 365];
export const defaultDayCount = 30;
export const maxDayCount = 3650;
const oldestDate = "2000-01-01";

export interface Period extends DateRange {
  mode: PeriodMode;
  // Value of the address parameter
  id: string;
}

// Rejects impossible dates such as February 30
const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && addDays(value, 0) === value;

export function calendarPeriod(mode: CalendarMode, anchor: string): Period {
  if (mode === "week") {
    const start = weekStart(anchor);
    return { mode, id: start, start, end: addDays(start, 6) };
  }
  if (mode === "month") return { mode, id: anchor.slice(0, 7), ...monthRange(anchor.slice(0, 7)) };
  return { mode, id: anchor.slice(0, 4), ...yearRange(anchor.slice(0, 4)) };
}

export function lastDaysPeriod(count: number, today: string): Period {
  const days = Math.min(Math.max(Math.round(count) || defaultDayCount, 1), maxDayCount);
  return { mode: "days", id: String(days), ...lastDays(days, today) };
}

// Runs from the oldest run to today
export const allTimePeriod = (first: string, today: string): Period => ({ mode: "all", id: "", start: first, end: today });

// Reads addresses such as ?month=2026-04, falling back to this week unless told otherwise
export function parsePeriod(params: URLSearchParams, today: string, first: string = today, fallback: Period = calendarPeriod("week", today)): Period {
  if (params.has("all")) return allTimePeriod(first, today);
  const days = params.get("days");
  if (days && /^\d+$/.test(days)) return lastDaysPeriod(Number(days), today);
  for (const [mode, suffix] of [["week", ""], ["month", "-01"], ["year", "-01-01"]] as const) {
    const anchor = `${params.get(mode)}${suffix}`;
    if (isDate(anchor) && anchor >= oldestDate) return calendarPeriod(mode, anchor > today ? today : anchor);
  }
  return fallback;
}

export const periodHref = ({ mode, id }: Period, page = "/") => (mode === "all" ? `${page}?all` : `${page}?${mode}=${id}`);

// A date inside the period, today when the period contains it
export const anchorOf = ({ start, end }: Period, today: string) => (start <= today && end >= today ? today : start);

export function adjacentPeriod(period: Period, direction: -1 | 1, today: string): Period | null {
  if (period.mode === "days" || period.mode === "all" || (direction === 1 && period.end >= today)) return null;
  return calendarPeriod(period.mode, direction === 1 ? addDays(period.end, 1) : addDays(period.start, -1));
}

// Spells out both years when a week crosses into another one
export const weekName = ({ start, end }: DateRange) => `${start.slice(0, 4) === end.slice(0, 4) ? formatDay(start) : formatFullDate(start)} to ${formatFullDate(end)}`;

export function periodName(period: Period, today: string): string {
  const { mode, id, start, end } = period;
  if (mode === "days") return `Last ${Number(id).toLocaleString("en-US")} ${id === "1" ? "day" : "days"}`;
  if (mode === "all") return "All time";
  if (start <= today && end >= today) return `This ${mode}`;
  if (mode === "week") return weekName(period);
  return mode === "month" ? formatMonthTitle(id) : id;
}

export interface PeriodBucket extends DateRange {
  label: string;
  title: string;
  isCurrent: boolean;
  isFuture: boolean;
}

// Bar size follows the length of the period
export function bucketUnit({ mode, start, end }: Period): "day" | "week" | "month" | "year" {
  const length = daysBetween(start, end) + 1;
  if (mode === "year") return "month";
  return length <= 31 ? "day" : length <= 190 ? "week" : length <= 800 ? "month" : "year";
}

export function periodBuckets(period: Period, today: string): PeriodBucket[] {
  const { mode, start, end } = period;
  const unit = bucketUnit(period);
  const buckets: PeriodBucket[] = [];

  for (let from = start; from <= end; ) {
    const month = from.slice(0, 7);
    const next =
      unit === "day"
        ? addDays(from, 1)
        : unit === "week"
          ? addDays(weekStart(from), 7)
          : unit === "month"
            ? addDays(monthRange(month).end, 1)
            : addDays(yearRange(from.slice(0, 4)).end, 1);
    const to = next > end ? end : addDays(next, -1);
    const dayLabel = mode === "week" ? formatWeekdayName(from) : mode === "month" ? String(Number(from.slice(8))) : formatDay(from);
    buckets.push({
      start: from,
      end: to,
      label: unit === "day" ? dayLabel : unit === "week" ? formatDay(from) : unit === "month" ? formatMonthName(month) : from.slice(0, 4),
      title: unit === "day" ? formatWeekday(from) : unit === "week" ? `Week of ${formatDay(from)}` : unit === "month" ? formatMonthTitle(month) : from.slice(0, 4),
      isCurrent: from <= today && to >= today,
      isFuture: from > today,
    });
    from = next;
  }
  return buckets;
}
