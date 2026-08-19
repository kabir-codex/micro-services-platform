const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);

// Only instrument application routes; the /metrics endpoint itself and any
// non-route paths would pollute the histogram with scraping noise.
const EXCLUDED_PATHS = new Set(["/metrics"]);

function metricsMiddleware(req, res, next) {
  if (EXCLUDED_PATHS.has(req.path)) {
    return next();
  }
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({ method: req.method, route: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
}

module.exports = { register, metricsMiddleware };
