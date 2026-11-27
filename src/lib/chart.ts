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
  // Floating bars start here instead of stacking
  from?: number;
}

export interface Column {
  label: string;
  tip: Tip;
  segments: Segment[];
  isMuted?: boolean;
}

export interface Point {
  label: string;
  tip: Tip;
  value: number | null;
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface Stat {
  label: string;
  value: string;
  unit?: string;
  detail?: string | undefined;
}

export interface TableData {
  head: string[];
  rows: string[][];
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
