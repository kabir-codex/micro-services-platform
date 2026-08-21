const { createClient } = require("redis");
const app = require("./app");

const port = Number(process.env.PORT) || 4000;

const redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
redisClient.on("error", (err) => console.error("Redis client error", err));
redisClient.connect().catch((err) => console.error("Redis connect failed", err));
app.set("redisClient", redisClient);

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
