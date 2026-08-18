const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");
const healthRouter = require("./health");

function withServer(fn) {
  const app = express();
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
