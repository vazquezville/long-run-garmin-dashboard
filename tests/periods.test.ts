import assert from "node:assert/strict";
import { test } from "node:test";
import { listDays, splitRange } from "../src/lib/garmin/ranges.ts";
import { monthRange, upTo, yearRange } from "../src/lib/periods.ts";

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

test("a month and its year request the same windows", () => {
  const today = "2026-11-26";
  const month = splitRange(monthRange("2025-03"), 28, today);
  const year = splitRange(yearRange("2025"), 28, today).map((window) => window.start + window.end);
  assert.ok(month.every((window) => year.includes(window.start + window.end)));
});
