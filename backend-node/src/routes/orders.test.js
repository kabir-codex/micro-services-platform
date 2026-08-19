const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");
const ordersRouter = require("./orders");

function withServer(fn) {
  const app = express();
  app.use(express.json());
  app.use(ordersRouter);
  const server = app.listen(0);
  const { port } = server.address();
  return fn(port).finally(() => server.close());
}

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      { hostname: "127.0.0.1", port, method, path, headers: payload ? { "Content-Type": "application/json" } : {} },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

test("GET /orders returns a list", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders");
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

test("POST /orders rejects a missing quantity", async () => {
  await withServer(async (port) => {
    const res = await request(port, "POST", "/orders", { item: "Headphones" });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /quantity/);
  });
});

test("POST /orders rejects a non-positive quantity", async () => {
  await withServer(async (port) => {
    const res = await request(port, "POST", "/orders", { item: "Headphones", quantity: 0 });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /positive integer/);
  });
});

test("POST /orders rejects an empty item", async () => {
  await withServer(async (port) => {
    const res = await request(port, "POST", "/orders", { item: "   ", quantity: 1 });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /item/);
  });
});

test("POST /orders creates an order when the DB is unreachable (in-memory fallback)", async () => {
  await withServer(async (port) => {
    const res = await request(port, "POST", "/orders", { item: "Headphones", quantity: 3 });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.item, "Headphones");
    assert.strictEqual(res.body.quantity, 3);
    assert.strictEqual(res.body.status, "processing");
  });
});