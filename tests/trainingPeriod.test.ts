import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionName, toSessionKind } from "../src/lib/sessionKind.ts";
import { adjacentPeriod, anchorOf, bucketUnit, parsePeriod, periodBuckets, periodHref, periodName } from "../src/lib/trainingPeriod.ts";

const today = "2026-11-27";
const parse = (query: string) => parsePeriod(new URLSearchParams(query), today);

test("parsePeriod reads each kind of address", () => {
  assert.deepEqual(parse("week=2026-11-19"), { mode: "week", id: "2026-11-16", start: "2026-11-16", end: "2026-11-22" });
  assert.deepEqual(parse("month=2026-04"), { mode: "month", id: "2026-04", start: "2026-04-01", end: "2026-04-30" });
  assert.deepEqual(parse("year=2025"), { mode: "year", id: "2025", start: "2025-01-01", end: "2025-12-31" });
  assert.deepEqual(parse("days=45"), { mode: "days", id: "45", start: "2026-10-14", end: today });
  assert.equal(periodHref(parse("month=2026-04")), "/?month=2026-04");
});

test("parsePeriod falls back or clamps on bad values", () => {
  const thisWeek = parse("");
  assert.equal(thisWeek.id, "2026-11-23");
  for (const query of ["week=2026-02-30", "month=2026-13", "year=26", "year=1900", "days=-3", "week="]) {
    assert.deepEqual(parse(query), thisWeek, query);
  }
  assert.equal(parse("days=99999").id, "3650");
  assert.equal(parse("days=0").id, "30");
  assert.equal(parse("month=2027-05").id, "2026-11");
});

test("periods step back and forth without passing today", () => {
  assert.equal(adjacentPeriod(parse("month=2026-01"), -1, today)?.id, "2025-12");
  assert.equal(adjacentPeriod(parse("week=2026-11-16"), 1, today)?.id, "2026-11-23");
  assert.equal(adjacentPeriod(parse(""), 1, today), null);
  assert.equal(adjacentPeriod(parse("days=7"), -1, today), null);
  assert.equal(anchorOf(parse("year=2026"), today), today);
  assert.equal(anchorOf(parse("month=2026-04"), today), "2026-04-01");
});

test("the all time period starts at the oldest run", () => {
  const all = parsePeriod(new URLSearchParams("all"), today, "2021-03-20");
  assert.deepEqual(all, { mode: "all", id: "", start: "2021-03-20", end: today });
  assert.equal(periodHref(all), "/?all");
  assert.equal(periodName(all, today), "All time");
  assert.equal(adjacentPeriod(all, -1, today), null);
  assert.deepEqual(
    periodBuckets(all, today).map((bucket) => bucket.label),
    ["2021", "2022", "2023", "2024", "2025", "2026"],
  );
});

test("periodName speaks of the current period as this one", () => {
  assert.equal(periodName(parse("month=2026-11"), today), "This month");
  assert.equal(periodName(parse("month=2026-04"), today), "April 2026");
  assert.equal(periodName(parse("week=2021-12-29"), today), "Dec 27, 2021 to Jan 2, 2022");
  assert.equal(periodName(parse("days=1"), today), "Last 1 day");
});

test("bar size follows the length of the period", () => {
  const sizes = (query: string) => periodBuckets(parse(query), today).length;
  assert.equal(sizes(""), 7);
  assert.equal(sizes("month=2026-04"), 30);
  assert.equal(sizes("year=2026"), 12);
  assert.equal(sizes("days=45"), 7);
  assert.equal(sizes("days=3650"), 11);
  assert.deepEqual(
    ["", "days=45", "year=2026", "days=3650"].map((query) => bucketUnit(parse(query))),
    ["day", "week", "month", "year"],
  );
  const week = periodBuckets(parse(""), today);
  assert.deepEqual(
    week.slice(4, 6).map((bucket) => [bucket.label, bucket.isCurrent, bucket.isFuture]),
    [
      ["Fri", true, false],
      ["Sat", false, true],
    ],
  );
});

test("session kind prefers the race tag, then the name, then Garmin's label", () => {
  assert.equal(toSessionKind("W2 Sun Long Run - 22km Hilly"), "long");
  assert.equal(toSessionKind("Hill Repeats"), "interval");
  assert.equal(toSessionKind("Taper Intervals - Race Pace"), "interval");
  assert.equal(toSessionKind("City Marathon", "TEMPO"), "race");
  assert.equal(toSessionKind("Morning Run", "TEMPO", "race"), "race");
  assert.equal(toSessionKind("Morning Run", "AEROBIC_BASE"), "easy");
  assert.equal(toSessionKind("Morning Run"), "run");
});

test("sessionName only trims names written by a training plan", () => {
  assert.equal(sessionName("Town - W2 Thu Tempo - Rolling 400s (10."), "Tempo - Rolling 400s");
  assert.equal(sessionName("Park run (hilly)"), "Park run (hilly)");
});
