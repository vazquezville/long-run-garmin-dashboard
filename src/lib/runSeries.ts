import type { Point } from "./chart.ts";
import type { Stretch } from "./data/runDetail.ts";
import { formatNumber } from "./format.ts";

// Chart range with a margin, optionally wider than the data or ignoring slow outliers
export function distanceDomain(values: Array<number | null>, margin: number, { minSpan = 0, trimHigh = false }: { minSpan?: number | undefined; trimHigh?: boolean | undefined } = {}): [number, number] {
  const sorted = values.filter((value): value is number => value != null).sort((a, b) => a - b);
  const low = sorted[0] ?? 0;
  const high = sorted[trimHigh ? Math.floor((sorted.length - 1) * 0.95) : sorted.length - 1] ?? 0;
  const extra = Math.max(minSpan - (high - low), 0) / 2;
  return [low - extra - margin, high + extra + margin];
}

// Points along the distance, drawn no higher than the cap but described with the real value
export function distancePoints(stretches: Stretch[], values: Array<number | null>, unit: string, format: (value: number) => string, cap: number): Point[] {
  return stretches.map((stretch, index) => {
    const value = values[index] ?? null;
    return {
      label: formatNumber(stretch.endM / 1000, 1),
      value: value == null ? null : Math.min(value, cap),
      tip: {
        title: `${formatNumber(stretch.startM / 1000, 2)} to ${formatNumber(stretch.endM / 1000, 2)} km`,
        rows: [value == null ? { label: "", value: "No reading" } : { label: unit, value: format(value) }],
      },
    };
  });
}
