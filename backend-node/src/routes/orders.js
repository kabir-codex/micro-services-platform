const express = require("express");
const router = express.Router();
const { query } = require("../db");

// In-memory fallback so the demo works before migrations are run.
let memoryOrders = [
  { id: 1, item: "Wireless Mouse", quantity: 2, status: "shipped" },
  { id: 2, item: "Mechanical Keyboard", quantity: 1, status: "processing" },
];

// Simple landing route so the API responds somewhere friendly at the root.
router.get("/", (_req, res) => {
  res.json({
    service: "orders-api",
    endpoints: [
      "/health",
      "/ready",
      "GET /orders[?status=&limit=&offset=]",
      "GET /orders/:id",
      "POST /orders (honors Idempotency-Key)",
      "DELETE /orders/:id",
      "/metrics",
    ],
  });
});

router.get("/orders", async (req, res) => {
  // Optional ?status= filter; validated so it can't smuggle SQL.
  const { status } = req.query;
  if (status !== undefined && !["processing", "shipped", "delivered", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "unknown status filter" });
  }

  // Optional pagination. Defaults keep the response identical to the
  // unpaginated shape; clients opt in with ?limit= and ?offset=.
  const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
  const offset = req.query.offset === undefined ? undefined : Number(req.query.offset);
  const invalidPagination =
    (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) ||
    (offset !== undefined && (!Number.isInteger(offset) || offset < 0));
  if (invalidPagination) {
    return res.status(400).json({ error: "limit must be a positive integer and offset a non-negative integer" });
  }

  try {
    const result = await query(
      "SELECT id, item, quantity, status FROM orders WHERE ($1::text IS NULL OR status = $1) ORDER BY id LIMIT $2 OFFSET $3",
      [status ?? null, limit ?? null, offset ?? 0]
    );
    res.json(result.rows);
  } catch {
    // Table may not exist yet in a fresh demo environment.
    let rows = status ? memoryOrders.filter((o) => o.status === status) : memoryOrders;
    if (offset !== undefined) rows = rows.slice(offset);
    if (limit !== undefined) rows = rows.slice(0, limit);
    res.json(rows);
  }
});

router.get("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "id must be a positive integer" });
  }
  try {
    const result = await query("SELECT id, item, quantity, status FROM orders WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "order not found" });
    }
    return res.json(result.rows[0]);
  } catch {
    const order = memoryOrders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: "order not found" });
    }
    return res.json(order);
  }
});

router.delete("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "id must be a positive integer" });
  }
  try {
    const result = await query("DELETE FROM orders WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "order not found" });
    }
    return res.status(204).end();
  } catch {
    const index = memoryOrders.findIndex((o) => o.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "order not found" });
    }
    memoryOrders.splice(index, 1);
    return res.status(204).end();
  }
});

router.post("/orders", async (req, res) => {
  const { item, quantity } = req.body || {};

  // Idempotency: a client retrying with the same Idempotency-Key gets the
  // original response replayed instead of a duplicate order. The key lives
  // in Redis for 24h; without Redis (or a key) behavior is unchanged.
  const redisClient = req.app.get("redisClient");
  const idempotencyKey = req.get("Idempotency-Key");
  let replayed;
  if (redisClient?.isOpen && typeof idempotencyKey === "string" && idempotencyKey.trim()) {
    try {
      replayed = await redisClient.get(`idempotency:${idempotencyKey}`);
    } catch {
      replayed = undefined; // Redis down: treat as no key rather than fail the write.
    }
    if (replayed) {
      return res.set("Idempotency-Replayed", "true").status(200).json(JSON.parse(replayed));
    }
  }

  if (typeof item !== "string" || !item.trim()) {
    return res.status(400).json({ error: "item must be a non-empty string" });
  }
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive integer" });
  }
  try {
    const result = await query(
      "INSERT INTO orders (item, quantity, status) VALUES ($1, $2, 'processing') RETURNING id, item, quantity, status",
      [item, parsedQuantity]
    );
    if (redisClient?.isOpen && idempotencyKey) {
      redisClient
        .set(`idempotency:${idempotencyKey}`, JSON.stringify(result.rows[0]), { EX: 86_400 })
        .catch(() => {});
    }
    return res.status(201).json(result.rows[0]);
  } catch {
    const newOrder = { id: memoryOrders.length + 1, item, quantity: parsedQuantity, status: "processing" };
    memoryOrders.push(newOrder);
    if (redisClient?.isOpen && idempotencyKey) {
      redisClient
        .set(`idempotency:${idempotencyKey}`, JSON.stringify(newOrder), { EX: 86_400 })
        .catch(() => {});
    }
    return res.status(201).json(newOrder);
  }
});

module.exports = router;
