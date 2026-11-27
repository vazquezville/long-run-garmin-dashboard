import type { Activity } from "./data/types.ts";
import { sessionKinds, type SessionKind } from "./sessionKind.ts";

export const sortOptions = [
  { id: "newest", label: "Newest" },
  { id: "longest", label: "Longest" },
  { id: "fastest", label: "Fastest" },
  { id: "hardest", label: "Highest load" },
] as const;
export type Sort = (typeof sortOptions)[number]["id"];

// Each range includes its lower bound only
export const distanceRanges = [
  { id: "0-5", label: "0–5", name: "Under 5 km", from: 0, to: 5 },
  { id: "5-10", label: "5–10", name: "5 to 10 km", from: 5, to: 10 },
  { id: "10-15", label: "10–15", name: "10 to 15 km", from: 10, to: 15 },
  { id: "15-21", label: "15–21", name: "15 to 21 km", from: 15, to: 21 },
  { id: "21-30", label: "21–30", name: "21 to 30 km", from: 21, to: 30 },
  { id: "30", label: "30+", name: "30 km or more", from: 30, to: Infinity },
] as const;
export type DistanceRange = (typeof distanceRanges)[number];

export const pageSize = 30;

export interface RunQuery {
  kind: SessionKind | null;
  year: string | null;
  range: DistanceRange["id"] | null;
  search: string;
  sort: Sort;
  page: number;
}

export function parseRunQuery(params: URLSearchParams): RunQuery {
  const kind = params.get("type") ?? "";
  const year = params.get("year") ?? "";
  return {
    kind: Object.hasOwn(sessionKinds, kind) ? (kind as SessionKind) : null,
    year: /^\d{4}$/.test(year) ? year : null,
    range: distanceRanges.find((range) => range.id === params.get("distance"))?.id ?? null,
    search: (params.get("q") ?? "").trim().slice(0, 80),
    sort: sortOptions.find((option) => option.id === params.get("sort"))?.id ?? "newest",
    page: Math.max(Math.floor(Number(params.get("page"))) || 1, 1),
  };
}

// Address of a query, going back to the first page unless a page is given
export function runsHref(query: RunQuery, changes: Partial<RunQuery> = {}): string {
  const { kind, year, range, search, sort, page } = { ...query, page: 1, ...changes };
  const entries = { type: kind, year, distance: range, q: search, sort: sort === "newest" ? null : sort, page: page > 1 ? String(page) : null };
  const params = new URLSearchParams(Object.entries(entries).flatMap(([name, value]) => (value ? [[name, value]] : [])));
  return params.size ? `/runs?${params}` : "/runs";
}

export const isFiltered = ({ kind, year, range, search }: RunQuery) => Boolean(kind || year || range || search);

export const inRange = (run: Activity, { from, to }: DistanceRange) => run.distanceKm >= from && run.distanceKm < to;

// Ignores case and accents
const plain = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function filterRuns(runs: Activity[], { kind, year, range, search }: RunQuery): Activity[] {
  const bounds = distanceRanges.find((item) => item.id === range);
  const wanted = plain(search);
  return runs.filter(
    (run) => (!kind || run.kind === kind) && (!year || run.date.startsWith(year)) && (!bounds || inRange(run, bounds)) && plain(run.name).includes(wanted),
  );
}

// Expects runs newest first, which breaks ties
export function sortRuns(runs: Activity[], sort: Sort): Activity[] {
  if (sort === "longest") return runs.toSorted((a, b) => b.distanceKm - a.distanceKm);
  if (sort === "fastest") return runs.toSorted((a, b) => (a.paceSecPerKm ?? Infinity) - (b.paceSecPerKm ?? Infinity));
  if (sort === "hardest") return runs.toSorted((a, b) => (b.trainingLoad ?? 0) - (a.trainingLoad ?? 0));
  return runs;
}

export function paginate<T>(items: T[], page: number, size = pageSize) {
  const pages = Math.max(Math.ceil(items.length / size), 1);
  const current = Math.min(page, pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

// Consecutive runs of the same month stay together
export function groupByMonth(runs: Activity[]): Array<{ month: string; runs: Activity[] }> {
  const groups: Array<{ month: string; runs: Activity[] }> = [];
  for (const run of runs) {
    const month = run.date.slice(0, 7);
    if (groups.at(-1)?.month !== month) groups.push({ month, runs: [] });
    groups.at(-1)!.runs.push(run);
  }
  return groups;
}
