const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const express = require("express");
const ordersRouter = require("./orders");

function withServer(fn, { redisClient } = {}) {
  const app = express();
  app.use(express.json());
  if (redisClient !== undefined) {
    app.set("redisClient", redisClient);
  }
  app.use(ordersRouter);
  const server = app.listen(0);
  const { port } = server.address();
  return fn(port).finally(() => server.close());
}

function request(port, method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = { ...extraHeaders };
    if (payload) headers["Content-Type"] = "application/json";
    const req = http.request(
      { hostname: "127.0.0.1", port, method, path, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        }));
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
    assert.ok(res.body.endpoints.some((e) => e.includes("/orders")));
    assert.ok(res.body.endpoints.some((e) => e.startsWith("DELETE")));
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

test("GET /orders paginates the in-memory fallback with limit and offset", async () => {
  await withServer(async (port) => {
    const page = await request(port, "GET", "/orders?limit=1&offset=1");
    assert.strictEqual(page.status, 200);
    assert.strictEqual(page.body.length, 1);

    const all = await request(port, "GET", "/orders");
    assert.deepStrictEqual(page.body[0], all.body[1]);
  });
});

test("GET /orders rejects non-integer pagination params", async () => {
  await withServer(async (port) => {
    const res = await request(port, "GET", "/orders?limit=abc");
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /limit/);

    const negOffset = await request(port, "GET", "/orders?offset=-1");
    assert.strictEqual(negOffset.status, 400);
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

test("POST /orders replays the original response for a retried Idempotency-Key", async () => {
  // Minimal fake of the redis client surface the route uses.
  const store = new Map();
  const redisClient = {
    isOpen: true,
    get: async (k) => store.get(k),
    set: async (k, v) => store.set(k, v),
  };
  await withServer(async (port) => {
    const first = await request(
      port, "POST", "/orders",
      { item: "USB Cable", quantity: 2 },
      { "Idempotency-Key": "retry-1" }
    );
    assert.strictEqual(first.status, 201);

    const retry = await request(
      port, "POST", "/orders",
      { item: "USB Cable", quantity: 2 },
      { "Idempotency-Key": "retry-1" }
    );
    assert.strictEqual(retry.status, 200);
    assert.strictEqual(retry.headers["idempotency-replayed"], "true");
    assert.deepStrictEqual(retry.body, first.body);

    // A different key must create a fresh order.
    const fresh = await request(
      port, "POST", "/orders",
      { item: "USB Cable", quantity: 2 },
      { "Idempotency-Key": "retry-2" }
    );
    assert.strictEqual(fresh.status, 201);
    assert.notStrictEqual(fresh.body.id, first.body.id);
  }, { redisClient });
});

test("DELETE /orders/:id removes an order from the in-memory fallback", async () => {
  await withServer(async (port) => {
    const created = await request(port, "POST", "/orders", { item: "Webcam", quantity: 1 });
    const id = created.body.id;

    const deleted = await request(port, "DELETE", `/orders/${id}`);
    assert.strictEqual(deleted.status, 204);

    const gone = await request(port, "GET", `/orders/${id}`);
    assert.strictEqual(gone.status, 404);
  });
});

test("DELETE /orders/:id returns 404 for an unknown id", async () => {
  await withServer(async (port) => {
    const res = await request(port, "DELETE", "/orders/9999");
    assert.strictEqual(res.status, 404);
  });
});

test("DELETE /orders/:id rejects a non-numeric id", async () => {
  await withServer(async (port) => {
    const res = await request(port, "DELETE", "/orders/abc");
    assert.strictEqual(res.status, 400);
  });
});