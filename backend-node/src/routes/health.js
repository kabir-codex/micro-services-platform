const express = require("express");
const router = express.Router();

// Liveness: process is up. Never checks dependencies.
router.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

// Readiness: safe to receive traffic (DB + Redis reachable). A pool
// substitute can be injected via app settings so tests don't need a live DB.
router.get("/ready", async (req, res) => {
  const pool = req.app.get("dbPoolOverride") ?? require("../db").pool;
  const redisClient = req.app.get("redisClient");
  try {
    await pool.query("SELECT 1");
    if (redisClient?.isOpen) {
      await redisClient.ping();
    }
    res.status(200).json({ status: "ready" });
  } catch (err) {
    res.status(503).json({ status: "not_ready", error: err.message });
  }
});

module.exports = router;
