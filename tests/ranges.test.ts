import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, lastDays, listDays, splitRange, toIsoDate } from "../src/lib/garmin/ranges.ts";

test("toIsoDate uses the local calendar date", () => {
  assert.equal(toIsoDate(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("addDays crosses months, years and leap days", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-03-01", -1), "2028-02-29");
});

test("lastDays includes today", () => {
  assert.deepEqual(lastDays(7, "2026-11-26"), { start: "2026-11-20", end: "2026-11-26" });
  assert.equal(listDays(lastDays(90, "2026-11-26")).length, 90);
});

test("splitRange covers the range without gaps or oversized windows", () => {
  const range = lastDays(90, "2026-11-26");
  const windows = splitRange(range, 28);
  assert.ok(windows[0]!.start <= range.start);
  assert.equal(windows.at(-1)!.end, range.end);
  for (const [index, window] of windows.entries()) {
    assert.ok(listDays(window).length <= 28);
    if (index > 0) assert.equal(window.start, addDays(windows[index - 1]!.end, 1));
  }
});

test("splitRange keeps older windows stable from one day to the next", () => {
  const today = splitRange(lastDays(90, "2026-11-26"), 28);
  const tomorrow = splitRange(lastDays(90, "2026-11-27"), 28);
  assert.deepEqual(today.at(-2), tomorrow.at(-2));
});
