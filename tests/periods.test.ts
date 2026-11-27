import assert from "node:assert/strict";
import { test } from "node:test";
import { bucketByMonth } from "../src/lib/data/aggregate.ts";
import { listDays, splitRange } from "../src/lib/garmin/ranges.ts";
import { adjacent, availableMonths, monthInYear, monthRange, upTo, yearRange, yearsOf } from "../src/lib/periods.ts";

const months = ["2015-09", "2025-03", "2025-11", "2026-01", "2026-11"];

test("monthRange handles short, long and leap months", () => {
  assert.deepEqual(monthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
  assert.deepEqual(monthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" });
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2026-12-31" });
  assert.equal(listDays(yearRange("2028")).length, 366);
});

test("upTo cuts periods at today", () => {
  assert.equal(upTo(monthRange("2026-11"), "2026-11-26").end, "2026-11-26");
  assert.equal(upTo(monthRange("2026-10"), "2026-11-26").end, "2026-10-31");
});

test("availableMonths lists each active month once plus the current one", () => {
  assert.deepEqual(availableMonths(["2026-01-05", "2025-03-02", "2026-01-20"], "2026-02-01"), ["2025-03", "2026-01", "2026-02"]);
  assert.deepEqual(yearsOf(months), ["2015", "2025", "2026"]);
});

test("adjacent skips gaps in the history", () => {
  assert.deepEqual(adjacent(months, "2025-03"), { previous: "2015-09", next: "2025-11" });
  assert.deepEqual(adjacent(months, "2026-11"), { previous: "2026-01", next: undefined });
});

test("monthInYear keeps the month when it exists", () => {
  assert.equal(monthInYear(months, "2025", "11"), "2025-11");
  assert.equal(monthInYear(months, "2015", "11"), "2015-09");
});

test("bucketByMonth covers every month and flags the current one", () => {
  const buckets = bucketByMonth([{ date: "2026-02-28" }, { date: "2026-03-01" }], yearRange("2026"), "2026-03-15");
  assert.equal(buckets.length, 12);
  assert.deepEqual(
    buckets.slice(1, 3).map((bucket) => [bucket.month, bucket.items.length, bucket.isPartial]),
    [
      ["2026-02", 1, false],
      ["2026-03", 1, true],
    ],
  );
});

test("a month and its year request the same windows", () => {
  const today = "2026-11-26";
  const month = splitRange(monthRange("2025-03"), 28, today);
  const year = splitRange(yearRange("2025"), 28, today).map((window) => window.start + window.end);
  assert.ok(month.every((window) => year.includes(window.start + window.end)));
});
