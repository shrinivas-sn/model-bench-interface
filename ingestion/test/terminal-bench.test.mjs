import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  decodeFlight,
  readJsonObjectAt,
  extractLeaderboard,
  toItems,
} from "../sources/terminal-bench.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("decodeFlight decodes and joins Next.js flight chunks in order", () => {
  const html =
    '<script>self.__next_f.push([1,"a:{\\"x\\":"])</script><script>self.__next_f.push([1,"1}\\n"])</script>';
  assert.equal(decodeFlight(html), 'a:{"x":1}\n');
});

test("readJsonObjectAt extracts JSON object at starting index with nested and escaped characters", () => {
  const text = 'z{"a":"}{","b":{"c":1}}tail';
  assert.deepEqual(readJsonObjectAt(text, 1), { a: "}{", b: { c: 1 } });
});

test("extractLeaderboard extracts leaderboard title and runs from saved tbench-home.html", () => {
  const html = readFileSync(join(__dirname, "fixtures", "tbench-home.html"), "utf8");
  const payload = decodeFlight(html);
  const board = extractLeaderboard(payload);

  assert(board !== null);
  assert.match(board.title, /^Terminal-Bench \d/);
  assert(board.runs.length >= 10);

  const ids = board.runs.map((r) => r.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length);
});

test("toItems converts leaderboard runs into valid adapter record items", () => {
  const html = readFileSync(join(__dirname, "fixtures", "tbench-home.html"), "utf8");
  const payload = decodeFlight(html);
  const board = extractLeaderboard(payload);
  const items = toItems(board);

  assert(items.length >= 10);
  for (const item of items) {
    assert.equal(typeof item.accuracy, "number");
    assert(item.accuracy >= 0 && item.accuracy <= 100);
    assert.equal(typeof item.model_label, "string");
    assert(item.model_label.length > 0);
    assert.equal(typeof item.leaderboard_title, "string");
  }
});
