#!/usr/bin/env bash
# Creates the orders/products tables and a few rows so the dashboard has
# something to show immediately after a fresh deploy.
#
# This is a DEV seed script. If DATABASE_URL is not set it assumes the
# default local compose Postgres; it refuses to run against a host that is
# clearly not localhost, so it can't accidentally touch a shared database.
set -euo pipefail

: "${DATABASE_URL:=postgres://platform:platform_dev_password@localhost:5432/platform}"

if [[ "$DATABASE_URL" != *"@localhost:"* && "$DATABASE_URL" != *"@127.0.0.1:"* && "$DATABASE_URL" != *"@::1:"* ]]; then
  echo "Refusing to seed a non-local database ($DATABASE_URL)." >&2
  echo "Set DATABASE_URL to a localhost / 127.0.0.1 / ::1 host to override." >&2
  exit 1
fi

psql "$DATABASE_URL" <<SQL
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  item TEXT NOT NULL,
  quantity INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing'
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2)
);

INSERT INTO orders (item, quantity, status)
SELECT * FROM (VALUES
  ('Wireless Mouse', 2, 'shipped'),
  ('Mechanical Keyboard', 1, 'processing')
) AS v(item, quantity, status)
WHERE NOT EXISTS (SELECT 1 FROM orders);

INSERT INTO products (name, category, price)
SELECT * FROM (VALUES
  ('Wireless Mouse', 'Peripherals', 19.99),
  ('Mechanical Keyboard', 'Peripherals', 89.00),
  ('27in Monitor', 'Displays', 249.00)
) AS v(name, category, price)
WHERE NOT EXISTS (SELECT 1 FROM products);
SQL

echo "Seed complete."
