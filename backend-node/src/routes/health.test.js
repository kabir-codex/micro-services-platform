const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");
const healthRouter = require("./health");

function withServer(fn, { redisClient, dbPool } = {}) {
  const app = express();
  if (dbPool !== undefined) {
    app.set("dbPoolOverride", dbPool);
  }
  if (redisClient !== undefined) {
    app.set("redisClient", redisClient);
  }
  app.use(healthRouter);
  const server = app.listen(0);
  const { port } = server.address();
  return fn(port).finally(() => server.close());
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
      })
      .on("error", reject);
  });
}

test("GET /health returns 200 ok", async () => {
  await withServer(async (port) => {
    const res = await get(port, "/health");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ok");
  });
});

// The DB is unreachable in tests, so /ready must report not-ready rather than
// pretending to be traffic-safe. This is the signal the k8s readiness probe
// keys off — a false 200 would route live traffic at a broken pod.
test("GET /ready returns 503 when the database is unreachable", async () => {
  await withServer(async (port) => {
    const res = await get(port, "/ready");
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.status, "not_ready");
  }, { redisClient: { isOpen: false } });
});

// The happy path, with both dependencies stubbed healthy: this is what the
// probe sees once Postgres and Redis are up.
test("GET /ready returns 200 when the database and redis respond", async () => {
  let queried = 0;
  await withServer(async (port) => {
    const res = await get(port, "/ready");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ready");
    assert.strictEqual(queried, 1);
  }, {
    dbPool: { query: async () => { queried++; return { rows: [] }; } },
    redisClient: { isOpen: true, ping: async () => true },
  });
});

// A reachable DB with Redis down must still be ready: Redis is a cache here,
// not a source of truth, so losing it shouldn't pull every pod out of rotation.
test("GET /ready stays ready when only redis is down", async () => {
  await withServer(async (port) => {
    const res = await get(port, "/ready");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, "ready");
  }, {
    dbPool: { query: async () => ({ rows: [] }) },
    redisClient: { isOpen: false },
  });
});
