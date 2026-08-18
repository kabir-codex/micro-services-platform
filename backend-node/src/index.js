const express = require("express");
const { createClient } = require("redis");
const healthRouter = require("./routes/health");
const ordersRouter = require("./routes/orders");
const { register, metricsMiddleware } = require("./metrics");

const app = express();
const port = process.env.PORT || 4000;

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

const server = app.listen(port, () => console.log(`orders-api listening on :${port}`));

// Graceful shutdown so rolling updates don't drop in-flight requests.
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    redisClient.quit().finally(() => process.exit(0));
  });
});
