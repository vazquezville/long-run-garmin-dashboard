import { sum, weekStart } from "./data/aggregate.ts";
import type { Activity } from "./data/types.ts";
import { addDays, daysBetween, type DateRange } from "./garmin/ranges.ts";

const minWeeks = 16;
const maxWeeks = 60;

// Weeks drawn by the weekly charts, earlier ones included as context, none when too many to read
export function weeklyRange(period: DateRange, today: string): DateRange | null {
  const lastWeek = weekStart(period.end < today ? period.end : today);
  const count = Math.max(minWeeks, daysBetween(weekStart(period.start), lastWeek) / 7 + 1);
  return count > maxWeeks ? null : { start: addDays(lastWeek, -7 * (count - 1)), end: addDays(lastWeek, 6) };
}

export const totalLoad = (activities: Activity[]) => sum(activities.map((activity) => activity.trainingLoad));

export const totalClimb = (activities: Activity[]) => sum(activities.map((activity) => activity.elevationGain));

// Meters climbed, per kilometer and in the hilliest run, null without elevation data
export function climbSummary(activities: Activity[]) {
  const measured = activities.filter((activity) => activity.elevationGain != null);
  if (measured.length === 0) return null;
  const total = totalClimb(measured);
  const kilometers = sum(measured.map((activity) => activity.distanceKm));
  const top = measured.reduce((best, activity) => (activity.elevationGain! > best.elevationGain! ? activity : best));
  return { total, perKm: kilometers > 0 ? total / kilometers : null, top };
}

// Load of the last seven days against the weekly average of the last four weeks
export function loadComparison(activities: Activity[], end: string) {
  const since = (days: number) => totalLoad(activities.filter((activity) => activity.date > addDays(end, -days) && activity.date <= end));
  const recent = since(7);
  const average = since(28) / 4;
  return average > 0 ? { recent, average, change: recent / average - 1 } : null;
}

export const zoneTotals = (activities: Activity[]): number[] => [0, 1, 2, 3, 4].map((zone) => sum(activities.map((activity) => activity.zoneSec[zone] ?? 0)));

const intensities = [
  { label: "Easy", zones: "Zones 1 and 2", indices: [0, 1] },
  { label: "Moderate", zones: "Zone 3", indices: [2] },
  { label: "Hard", zones: "Zones 4 and 5", indices: [3, 4] },
];

// Share of the time spent at each effort, empty without heart rate
export function intensitySplit(totals: number[]) {
  const all = sum(totals);
  if (all === 0) return [];
  return intensities.map(({ label, zones, indices }) => {
    const seconds = sum(indices.map((index) => totals[index] ?? 0));
    return { label, zones, seconds, share: seconds / all };
  });
}
