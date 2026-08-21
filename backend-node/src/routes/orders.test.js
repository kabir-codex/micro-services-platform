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

test("GET / exposes service metadata", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.service, "orders-api");
    assert.ok(res.body.endpoints.includes("/orders"));
  });
});

test("GET /orders/:id returns an order from the in-memory fallback", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders/1");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.item, "Wireless Mouse");
  });
});

test("GET /orders/:id returns 404 for an unknown id", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders/999");
    assert.strictEqual(res.status, 404);
  });
});

test("GET /orders/:id rejects a non-numeric id", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders/abc");
    assert.strictEqual(res.status, 400);
  });
});

test("GET /orders returns a list", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders");
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

test("GET /orders?status= filters the in-memory fallback by status", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders?status=shipped");
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length > 0);
    for (const order of res.body) {
      assert.strictEqual(order.status, "shipped");
    }
  });
});

test("GET /orders rejects an unknown status filter", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders?status=bogus");
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /unknown status/);
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