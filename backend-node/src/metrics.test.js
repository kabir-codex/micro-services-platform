const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");
const { metricsMiddleware, register } = require("./metrics");

function request(port, method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method, path },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

test("metrics endpoint is served and returns prometheus text", async () => {
  // Can't use the whole app here (index.js listens immediately); exercise the
  // middleware against a minimal app and a stub /metrics handler, mirroring how
  // index.js wires it.
  const app = express();
  app.use(metricsMiddleware);
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const res = await request(port, "GET", "/metrics");
    assert.strictEqual(res.status, 200);
    assert.match(res.headers["content-type"], /text\/plain/);
    assert.match(res.body, /http_requests_total/);
  } finally {
    server.close();
  }
});

// An untouched prom-client counter emits only HELP/TYPE lines, no data line.
// So "no http_requests_total data line" is the proof the endpoint was never
// instrumented.
const hasRequestCounterData = (text) => /^# (?:HELP|TYPE) http_requests_total\b/m.test(text);

test("scraping /metrics does not instrument the scrape itself", async () => {
  const app = express();
  app.use(metricsMiddleware);
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });
  const server = app.listen(0);
  const { port } = server.address();
  try {
    // Several scrapes: had the middleware instrumented /metrics, the counter
    // (and histogram) would have data lines. They must not.
    for (let i = 0; i < 3; i++) {
      await request(port, "GET", "/metrics");
    }
    const body = await register.metrics();
    assert.ok(hasRequestCounterData(body), "expected request counter HELP/TYPE");
    assert.doesNotMatch(body, /^http_requests_total /m, "/metrics scrape must not emit a counter sample");
    assert.doesNotMatch(body, /^http_request_duration_seconds_bucket/m, "/metrics scrape must not emit histogram samples");
  } finally {
    server.close();
  }
});