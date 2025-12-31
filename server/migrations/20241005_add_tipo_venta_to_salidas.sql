ALTER TABLE salidas_alm
  ADD COLUMN IF NOT EXISTS tipo_venta VARCHAR(20) NOT NULL DEFAULT 'contado';

UPDATE salidas_alm
SET tipo_venta = COALESCE(NULLIF(tipo_venta, ''), 'contado');

ALTER TABLE salidas_alm
  ALTER COLUMN tipo_venta SET DEFAULT 'contado';
