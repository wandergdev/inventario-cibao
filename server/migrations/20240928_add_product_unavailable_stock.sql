ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS stock_no_disponible INTEGER NOT NULL DEFAULT 0;

UPDATE productos
SET stock_no_disponible = 0
WHERE stock_no_disponible IS NULL;
