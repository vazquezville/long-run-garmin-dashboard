import { addDays, daysBetween, type DateRange } from "../garmin/ranges.ts";
import type { Activity } from "./types.ts";

export const sum = (values: Array<number | null>): number => values.reduce<number>((total, value) => total + (value ?? 0), 0);

// Mean of recorded values, null when there are none
export function average(values: Array<number | null>): number | null {
  const recorded = values.filter((value): value is number => value != null);
  return recorded.length ? sum(recorded) / recorded.length : null;
}

// Monday of the week containing the date
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export interface Bucket<T> {
  start: string;
  isPartial: boolean;
  items: T[];
}

// Groups items by day, or by Monday week, covering the whole range
export function bucketByDate<T extends { date: string }>(items: T[], range: DateRange, unit: "day" | "week"): Array<Bucket<T>> {
  const buckets = new Map<string, Bucket<T>>();
  for (let offset = 0; offset <= daysBetween(range.start, range.end); offset++) {
    const date = addDays(range.start, offset);
    const start = unit === "week" ? weekStart(date) : date;
    if (!buckets.has(start)) {
      const isPartial = unit === "week" && (start < range.start || addDays(start, 6) > range.end);
      buckets.set(start, { start, isPartial, items: [] });
    }
  }
  for (const item of items) {
    if (item.date < range.start || item.date > range.end) continue;
    buckets.get(unit === "week" ? weekStart(item.date) : item.date)?.items.push(item);
  }
  return [...buckets.values()];
}

// One bucket per calendar month in the range, flagging the one in progress
export function bucketByMonth<T extends { date: string }>(items: T[], { start, end }: DateRange, today: string): Array<Bucket<T> & { month: string }> {
  const buckets: Array<Bucket<T> & { month: string }> = [];
  for (let date = `${start.slice(0, 7)}-01`; date <= end; date = `${addDays(date, 31).slice(0, 7)}-01`) {
    const month = date.slice(0, 7);
    buckets.push({ month, start: date, isPartial: today.startsWith(month), items: items.filter((item) => item.date.startsWith(month)) });
  }
  return buckets;
}

// One entry per week, keeping the latest reading of each
export function latestPerWeek<T extends { date: string }>(readings: T[], range: DateRange) {
  return bucketByDate(readings, range, "week").map((bucket) => ({ start: bucket.start, reading: bucket.items.at(-1) }));
}

// Pace weighted by distance across several activities
export function overallPace(activities: Activity[]): number | null {
  const moved = activities.filter((activity) => activity.distanceKm > 0);
  const kilometers = sum(moved.map((activity) => activity.distanceKm));
  return kilometers > 0 ? sum(moved.map((activity) => activity.movingSec)) / kilometers : null;
}

export type FormMetric = keyof Activity["form"];

export const hasForm = (activity: Activity) => activity.sport === "run" && Object.values(activity.form).some((value) => value != null);

// Mean across runs weighted by moving time, null when none recorded it
export function formAverage(activities: Activity[], metric: FormMetric): number | null {
  const measured = activities.filter((activity) => activity.sport === "run" && activity.form[metric] != null);
  const seconds = sum(measured.map((activity) => activity.movingSec));
  return seconds > 0 ? sum(measured.map((activity) => activity.form[metric]! * activity.movingSec)) / seconds : null;
}

export type Effort = keyof Activity["fastest"];

export function bestEffort(activities: Activity[], effort: Effort): { seconds: number; date: string } | null {
  let best: { seconds: number; date: string } | null = null;
  for (const activity of activities) {
    const seconds = activity.fastest[effort];
    if (activity.sport === "run" && seconds && (!best || seconds < best.seconds)) best = { seconds, date: activity.date };
  }
  return best;
}
