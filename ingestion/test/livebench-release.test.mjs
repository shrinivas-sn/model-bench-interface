import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverLatestRelease,
  scoresUrl,
  costUrl,
  categoriesUrl,
  RELEASE,
} from "../sources/livebench.mjs";

test("scoresUrl and costUrl format correct URLs", () => {
  assert.equal(scoresUrl("2026-10-14"), "https://livebench.ai/data/20261014/table.csv");
  assert.equal(costUrl("2026-10-14"), "https://livebench.ai/data/20261014/cost.csv");
  assert.equal(categoriesUrl("2026-10-14"), "https://livebench.ai/data/20261014/categories.json");
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
    if (urlStr === "https://livebench.ai/data/20260910/table.csv") {
      return new Response("Not Found", { status: 404 });
    }
    if (urlStr === "https://livebench.ai/data/20260722/table.csv") {
      return new Response("Not Found", { status: 404 });
    }
    if (urlStr === "https://livebench.ai/data/20260625/table.csv") {
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

test("RELEASE fallback is the newest release found on 20/10/2026", () => {
  assert.equal(RELEASE, "2026-10-14");
});

test("discoverLatestRelease reads compact YYYYMMDD release ids and skips a 404 newest one", async () => {
  const fetchStub = async (url) => {
    const urlStr = String(url);
    if (urlStr === "https://livebench.ai/") {
      return new Response(`<script defer src="/static/js/main.c8f94910.js"></script>`, { status: 200 });
    }
    if (urlStr === "https://livebench.ai/static/js/main.c8f94910.js") {
      return new Response(
        `_e=["20261014","20260902"],Me=e=>e,i="?v=1792438049",n="claude-opus-4-5-20251101-high";`,
        { status: 200 }
      );
    }
    if (urlStr === "https://livebench.ai/data/20261014/table.csv") {
      return new Response("Not Found", { status: 404 });
    }
    if (urlStr === "https://livebench.ai/data/20260902/table.csv") {
      return new Response("model,coding\nm,1", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  };

  assert.equal(await discoverLatestRelease(fetchStub), "2026-09-02");
});

test("discoverLatestRelease returns null when every table answers HTML", async () => {
  const fetchStub = async (url) => {
    const urlStr = String(url);
    if (urlStr === "https://livebench.ai/") {
      return new Response(`<script src="/static/js/main.abc.js"></script>`, { status: 200 });
    }
    if (urlStr === "https://livebench.ai/static/js/main.abc.js") {
      return new Response(`_e=["20261014"],r=["2026-06-25"]`, { status: 200 });
    }
    return new Response("<!doctype html><html></html>", { status: 200 });
  };

  assert.equal(await discoverLatestRelease(fetchStub), null);
});
