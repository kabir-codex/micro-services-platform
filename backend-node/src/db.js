const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://platform:platform_dev_password@localhost:5432/platform",
  max: 10,
  idleTimeoutMillis: 30000,
});

// Queries slower than this get logged even in production — the signal worth
// having when Postgres starts struggling. Dev mode logs everything.
const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS) || 200;

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production") {
    console.log("query", { text, duration, rows: res.rowCount });
  } else if (duration >= SLOW_QUERY_MS) {
    console.warn("slow query", { text, duration, rows: res.rowCount });
  }
  return res;
}

module.exports = { pool, query };
