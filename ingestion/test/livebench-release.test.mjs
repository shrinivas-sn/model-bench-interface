import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverLatestRelease,
  scoresUrl,
  costUrl,
  RELEASE,
} from "../sources/livebench.mjs";

test("scoresUrl and costUrl format correct URLs", () => {
  assert.equal(scoresUrl("2026-06-25"), "https://livebench.ai/table_2026_06_25.csv");
  assert.equal(costUrl("2026-06-25"), "https://livebench.ai/cost_2026_06_25.csv");
});

test("discoverLatestRelease finds the newest release where scores table returns 200 and starts with model", async () => {
  const fetchStub = async (url) => {
    const urlStr = String(url);
    if (urlStr === "https://livebench.ai/") {
      return new Response(
        `<!doctype html><html><body><script src="/static/js/main.abc.js"></script></body></html>`,
        { status: 200 }
      );
    }
    if (urlStr === "https://livebench.ai/static/js/main.abc.js") {
      return new Response(
        `const releases = ["2026-09-10", "2026_06_25", "2026-07-22"];`,
        { status: 200 }
      );
    }
    if (urlStr === "https://livebench.ai/table_2026_09_10.csv") {
      return new Response("Not Found", { status: 404 });
    }
    if (urlStr === "https://livebench.ai/table_2026_07_22.csv") {
      return new Response("Not Found", { status: 404 });
    }
    if (urlStr === "https://livebench.ai/table_2026_06_25.csv") {
      return new Response("model,a\nm,1", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };

  const release = await discoverLatestRelease(fetchStub);
  assert.equal(release, "2026-06-25");
});

test("discoverLatestRelease returns null when every table returns 404", async () => {
  const fetchStub = async (url) => {
    const urlStr = String(url);
    if (urlStr === "https://livebench.ai/") {
      return new Response(`<script src="/static/js/main.xyz.js"></script>`, { status: 200 });
    }
    if (urlStr === "https://livebench.ai/static/js/main.xyz.js") {
      return new Response(`"2026-06-25"`, { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };

  const release = await discoverLatestRelease(fetchStub);
  assert.equal(release, null);
});

test("discoverLatestRelease returns null when fetch throws", async () => {
  const fetchStub = async () => {
    throw new Error("Network error");
  };

  const release = await discoverLatestRelease(fetchStub);
  assert.equal(release, null);
});
