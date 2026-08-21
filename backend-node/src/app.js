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

// Baseline security headers. This API serves JSON only, so the set is small:
// no caching of responses, and a conservative content-type sniffing stance.
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "no-store");
  next();
});

// Malformed JSON should be a 400 the client can parse, not an HTML stack page.
app.use((err, _req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "malformed JSON body" });
  }
  next(err);
});

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
