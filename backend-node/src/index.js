const express = require("express");
const compression = require("compression");
const { createClient } = require("redis");
const healthRouter = require("./routes/health");
const ordersRouter = require("./routes/orders");
const { register, metricsMiddleware } = require("./metrics");

const app = express();
app.use(compression());
app.use(express.json());
const port = Number(process.env.PORT) || 4000;

const redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
redisClient.on("error", (err) => console.error("Redis client error", err));
redisClient.connect().catch((err) => console.error("Redis connect failed", err));
app.set("redisClient", redisClient);

app.use(metricsMiddleware);
app.use(healthRouter);
app.use(ordersRouter);

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(port, HOST, () => console.log(`orders-api listening on ${HOST}:${port}`));

// Graceful shutdown so rolling updates don't drop in-flight requests.
// If in-flight requests refuse to drain, force-exit after 10s so the
// orchestrator doesn't have to SIGKILL us.
const SHUTDOWN_TIMEOUT_MS = 10_000;
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    redisClient.quit().finally(() => process.exit(0));
  });
  setTimeout(() => {
    console.error("shutdown drain timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
});
