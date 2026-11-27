import { scaleLinear } from "d3-scale";

export interface TipRow {
  label: string;
  value: string;
  color?: string;
}

export interface Tip {
  title: string;
  rows: TipRow[];
}

export interface Segment {
  value: number;
  color: string;
}

export interface Column {
  label: string;
  tip: Tip;
  segments: Segment[];
}

export interface Point {
  label: string;
  tip: Tip;
  value: number | null;
}

// A selectable figure and the chart it opens, absent without data
export interface TrendMetric {
  id: string;
  label: string;
  unit: string;
  value: string;
  chart: {
    title: string;
    note: string;
    points: Point[];
    domain: [number, number];
    reference?: number | undefined;
    formatTick: (value: number) => string;
    // Counts such as steps are drawn as columns standing on zero
    isColumns?: boolean;
  } | null;
}

// Rounded domain with clean ticks, returned as percentages from the baseline
export function createAxis(min: number, max: number, tickCount = 4) {
  const scale = scaleLinear()
    .domain([min, max === min ? min + 1 : max])
    .range([0, 100])
    .nice(tickCount);
  return { position: (value: number) => scale(value), ticks: scale.ticks(tickCount) };
}

// Indices to label on the x axis, anchored on the latest one
export function labelIndices(count: number, maxLabels = 7): number[] {
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const indices: number[] = [];
  for (let index = count - 1; index >= 0; index -= step) indices.unshift(index);
  return indices;
}
