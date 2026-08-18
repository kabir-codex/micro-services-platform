#!/usr/bin/env bash
# Creates the orders/products tables and a few rows so the dashboard has
# something to show immediately after a fresh deploy.
set -euo pipefail

: "${DATABASE_URL:=postgres://platform:platform_dev_password@localhost:5432/platform}"

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
