const express = require("express");
const router = express.Router();
const { query } = require("../db");

// In-memory fallback so the demo works before migrations are run.
let memoryOrders = [
  { id: 1, item: "Wireless Mouse", quantity: 2, status: "shipped" },
  { id: 2, item: "Mechanical Keyboard", quantity: 1, status: "processing" },
];

router.get("/orders", async (_req, res) => {
  try {
    const result = await query("SELECT id, item, quantity, status FROM orders ORDER BY id");
    res.json(result.rows);
  } catch {
    // Table may not exist yet in a fresh demo environment.
    res.json(memoryOrders);
  }
});

router.post("/orders", express.json(), async (req, res) => {
  const { item, quantity } = req.body || {};
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
    return res.status(201).json(result.rows[0]);
  } catch {
    const newOrder = { id: memoryOrders.length + 1, item, quantity: parsedQuantity, status: "processing" };
    memoryOrders.push(newOrder);
    return res.status(201).json(newOrder);
  }
});

module.exports = router;
