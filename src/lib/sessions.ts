import type { Tip } from "./chart.ts";
import type { Activity } from "./data/types.ts";
import { formatDuration, formatNumber, formatWeekday } from "./format.ts";
import { sports } from "./sports.ts";

const longestSession = 3 * 60 * 60;

// Circle area grows with duration, capped at three hours
export const discSize = (seconds: number) => 9 + 25 * Math.sqrt(Math.min(seconds, longestSession) / longestSession);

export const describeActivity = (activity: Activity) =>
  [activity.distanceKm > 0 ? `${formatNumber(activity.distanceKm, 1)} km` : null, formatDuration(activity.durationSec)].filter(Boolean).join(", ");

export const dayTip = (date: string, activities: Activity[]): Tip => ({
  title: formatWeekday(date),
  rows: activities.map((activity) => ({ label: sports[activity.sport].label, value: describeActivity(activity), color: sports[activity.sport].color })),
});

export const tipText = ({ title, rows }: Tip) => `${title}: ${rows.map((row) => `${row.label} ${row.value}`).join("; ")}`;
