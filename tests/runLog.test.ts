import assert from "node:assert/strict";
import { test } from "node:test";
import { toActivities } from "../src/lib/data/normalize.ts";
import { filterRuns, groupByMonth, paginate, parseRunQuery, runsHref, sortRuns } from "../src/lib/runLog.ts";

const run = (activityId: number, date: string, activityName: string, distance: number, speed: number, load: number) => ({
  activityId,
  activityName,
  startTimeLocal: `${date} 18:00:00`,
  activityType: { typeKey: "running" },
  distance,
  averageSpeed: speed,
  activityTrainingLoad: load,
});
const runs = toActivities(
  [
    run(1, "2025-03-10", "Easy Run", 5000, 3, 60),
    run(2, "2026-04-11", "Café Marathon", 42200, 3.2, 400),
    run(3, "2026-04-20", "Tempo", 10000, 4, 200),
  ],
  { start: "2025-01-01", end: "2026-12-31" },
);
const query = (text: string) => parseRunQuery(new URLSearchParams(text));
const ids = (text: string) => filterRuns(runs, query(text)).map((item) => item.id);

test("parseRunQuery drops values it does not know", () => {
  assert.deepEqual(query("type=sprint&year=26&distance=7&sort=x&page=-2"), { kind: null, year: null, range: null, search: "", sort: "newest", page: 1 });
  assert.equal(query("type=tempo&page=3").kind, "tempo");
  assert.equal(query("type=toString").kind, null);
});

test("runsHref keeps filters, omits defaults and restarts the pages", () => {
  const current = query("type=easy&sort=newest&page=4");
  assert.equal(runsHref(current), "/runs?type=easy");
  assert.equal(runsHref(current, { page: 2 }), "/runs?type=easy&page=2");
  assert.equal(runsHref(current, { kind: null }), "/runs");
});

test("filterRuns combines type, year, distance and a loose name search", () => {
  assert.deepEqual(ids(""), [3, 2, 1]);
  assert.deepEqual(ids("year=2026&type=race"), [2]);
  assert.deepEqual(ids("distance=5-10"), [1]);
  assert.deepEqual(ids("distance=10-15"), [3]);
  assert.deepEqual(ids("q=CAFE"), [2]);
});

test("sortRuns orders by distance, pace or load", () => {
  const order = (sort: "longest" | "fastest" | "hardest") => sortRuns(runs, sort).map((item) => item.id);
  assert.deepEqual(order("longest"), [2, 3, 1]);
  assert.deepEqual(order("fastest"), [3, 2, 1]);
  assert.deepEqual(order("hardest"), [2, 3, 1]);
});

test("paginate stays within the last page and months stay grouped", () => {
  assert.deepEqual(paginate([1, 2, 3], 9, 2), { items: [3], page: 2, pages: 2 });
  assert.deepEqual(paginate([], 1), { items: [], page: 1, pages: 1 });
  assert.deepEqual(
    groupByMonth(runs).map((group) => [group.month, group.runs.length]),
    [
      ["2026-04", 2],
      ["2025-03", 1],
    ],
  );
});
