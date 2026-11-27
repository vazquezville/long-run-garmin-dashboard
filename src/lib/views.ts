import type { DateRange } from "./garmin/ranges.ts";

export const within = <T extends { date: string }>(items: T[], { start, end }: DateRange): T[] => items.filter((item) => item.date >= start && item.date <= end);

export const rangeOptions = [7, 28, 90] as const;
export type Range = (typeof rangeOptions)[number];
export const defaultRange: Range = 28;
export const maxRange: Range = 90;
