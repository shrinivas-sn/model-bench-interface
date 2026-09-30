import { test } from "node:test";
import assert from "node:assert/strict";

import { formatAge, ageInDays, summarizeFreshness, summarizeRelease, STALE_AFTER_DAYS } from "../../lib/status.mjs";

const NOW = new Date("2026-09-28T12:00:00Z").getTime();
const hoursAgo = (h) => new Date(NOW - h * 3_600_000).toISOString();

// ------------------------------------------------------------------ age -----

test("formatAge describes hours, then days, then nothing", () => {
  assert.equal(formatAge(hoursAgo(0.2), NOW), "just now");
  assert.equal(formatAge(hoursAgo(1), NOW), "1 hour ago");
  assert.equal(formatAge(hoursAgo(5), NOW), "5 hours ago");
  assert.equal(formatAge(hoursAgo(24), NOW), "1 day ago");
  assert.equal(formatAge(hoursAgo(72), NOW), "3 days ago");
});

test("formatAge degrades to an empty string rather than NaN", () => {
  assert.equal(formatAge(null, NOW), "");
  assert.equal(formatAge("", NOW), "");
  assert.equal(formatAge("not-a-date", NOW), "");
});

test("formatAge does not report a future timestamp as negative", () => {
  assert.equal(formatAge(new Date(NOW + 5_000).toISOString(), NOW), "just now");
});

test("ageInDays floors whole days and returns null for unusable input", () => {
  assert.equal(ageInDays(hoursAgo(1), NOW), 0);
  assert.equal(ageInDays(hoursAgo(47), NOW), 1);
  assert.equal(ageInDays(hoursAgo(50), NOW), 2);
  assert.equal(ageInDays(null, NOW), null);
  assert.equal(ageInDays("nope", NOW), null);
});

// ------------------------------------------------------------ summarize -----

test("summarizeFreshness reports ok with a full healthy count", () => {
  const s = summarizeFreshness(
    {
      a: { outcome: "ok", fetched_at: hoursAgo(3) },
      b: { outcome: "ok", fetched_at: hoursAgo(2) },
    },
    NOW
  );
  assert.equal(s.tone, "ok");
  assert.equal(s.label, "up to date");
  assert.equal(s.healthy, 2);
  assert.equal(s.total, 2);
  assert.equal(s.fetchedAt, hoursAgo(2));
});

test("summarizeFreshness counts only the newest fetch as the reported time", () => {
  const s = summarizeFreshness(
    {
      a: { outcome: "ok", fetched_at: hoursAgo(30) },
      b: { outcome: "ok", fetched_at: hoursAgo(1) },
    },
    NOW
  );
  assert.equal(s.fetchedAt, hoursAgo(1));
  assert.equal(s.ageDays, 0);
});

test("summarizeFreshness flags a failed source as an error", () => {
  const s = summarizeFreshness(
    {
      a: { outcome: "ok", fetched_at: hoursAgo(1) },
      b: { outcome: "error", fetched_at: hoursAgo(1) },
    },
    NOW
  );
  assert.equal(s.tone, "err");
  assert.equal(s.label, "1 source failed");
  assert.equal(s.healthy, 1);
});

test("summarizeFreshness reports a total failure distinctly", () => {
  const s = summarizeFreshness({ a: { outcome: "error" }, b: { outcome: "error" } }, NOW);
  assert.equal(s.tone, "err");
  assert.equal(s.label, "sources failed");
});

test("summarizeFreshness downgrades silence to stale once the cron has clearly stopped", () => {
  // Every source says "ok" but nothing has run for STALE_AFTER_DAYS — the daily
  // cron is broken, and reporting "up to date" here would be a lie.
  const s = summarizeFreshness(
    { a: { outcome: "ok", fetched_at: hoursAgo(STALE_AFTER_DAYS * 24 + 4) } },
    NOW
  );
  assert.equal(s.tone, "stale");
  assert.match(s.label, /not refreshed in/);
});

test("summarizeFreshness tolerates a source with no timestamp", () => {
  const s = summarizeFreshness({ a: { outcome: "ok" } }, NOW);
  assert.equal(s.tone, "ok");
  assert.equal(s.fetchedAt, null);
  assert.equal(s.ageDays, null);
});

test("summarizeFreshness reports no-data instead of pretending success", () => {
  for (const input of [{}, null, undefined]) {
    const s = summarizeFreshness(input, NOW);
    assert.equal(s.tone, "stale");
    assert.equal(s.label, "no data");
    assert.equal(s.total, 0);
  }
});

// -------------------------------------------------------------- release -----

test("summarizeRelease splits the provenance line on plus signs", () => {
  assert.equal(
    summarizeRelease("LiveBench 2026-06-25 + Terminal-Bench 4.0 + OpenRouter prices"),
    "LiveBench 2026-06-25 · Terminal-Bench 4.0 · OpenRouter prices"
  );
  assert.equal(summarizeRelease(""), "");
  assert.equal(summarizeRelease(null), "");
});
