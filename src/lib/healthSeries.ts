import type { TrendMetric } from "./chart.ts";
import { average } from "./data/aggregate.ts";
import { formatCompact, formatNumber } from "./format.ts";
import type { PeriodBucket } from "./trainingPeriod.ts";
import { within } from "./views.ts";

interface Series<T> {
  id: string;
  label: string;
  unit: string;
  digits?: number;
  items: T[];
  read: (item: T) => number | null;
  // Counts stand on zero as columns, vitals move as lines
  isColumns?: boolean;
  // Replaces the period average as the dashed line
  goal?: number | null;
}

// A figure for the whole period and its average in every bar of the calendar
export function toTrend<T extends { date: string }>(series: Series<T>, buckets: PeriodBucket[], unitName: string): TrendMetric {
  const { id, label, unit, digits = 0, items, read, isColumns = false, goal } = series;
  const mean = average(items.map(read));
  const values = buckets.map((bucket) => average(within(items, bucket).map(read)));
  const recorded = values.filter((value): value is number => value != null);
  const format = (value: number) => formatNumber(value, digits);
  const figure = { id, label, unit, value: formatNumber(mean, digits) };
  if (mean == null || recorded.length === 0) return { ...figure, chart: null };

  const low = Math.min(...recorded);
  const high = Math.max(...recorded);
  const margin = Math.max((high - low) * 0.15, 1);
  const reference = goal ?? mean;
  return {
    ...figure,
    chart: {
      title: `${label} by ${unitName}`,
      note:
        goal == null
          ? `The dashed line is the period average, ${format(mean)} ${unit}`
          : `The dashed line is your daily goal of ${format(goal)}, the period average is ${format(mean)}`,
      points: buckets.map((bucket, index) => {
        const value = values[index] ?? null;
        return {
          label: bucket.label,
          value,
          tip: {
            title: bucket.title,
            rows: [value == null ? { label: "", value: bucket.isFuture ? "Still to come" : "No reading" } : { label: unit, value: format(value) }],
          },
        };
      }),
      domain: [Math.max(low - margin, 0), high + margin],
      reference,
      formatTick: isColumns ? formatCompact : format,
      isColumns,
    },
  };
}
