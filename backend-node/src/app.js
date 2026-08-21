const express = require("express");
const compression = require("compression");
const healthRouter = require("./routes/health");
const ordersRouter = require("./routes/orders");
const { register, metricsMiddleware } = require("./metrics");

// The fully-wired Express app, separate from index.js so tests can drive it
// over HTTP without binding a port at import time or touching Redis.
const app = express();
app.use(compression());
app.use(express.json());

app.use(metricsMiddleware);
app.use(healthRouter);
app.use(ordersRouter);

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// API clients get JSON errors, not Express's default HTML error page.
app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

module.exports = app;
