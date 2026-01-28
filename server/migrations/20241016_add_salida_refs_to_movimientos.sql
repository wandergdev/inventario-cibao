ALTER TABLE movimientos_inv
  ADD COLUMN IF NOT EXISTS id_salida UUID REFERENCES salidas_alm(id_salida) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_detalle_salida UUID REFERENCES detalle_salidas(id_detalle) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_id_salida ON movimientos_inv(id_salida);
CREATE INDEX IF NOT EXISTS idx_movimientos_id_detalle_salida ON movimientos_inv(id_detalle_salida);

WITH obs_match AS (
  SELECT m.id_movimiento, s.id_salida
  FROM movimientos_inv m
  INNER JOIN salidas_alm s ON LOWER(m.observacion) = LOWER('Salida ' || s.ticket)
  WHERE m.id_salida IS NULL
)
UPDATE movimientos_inv m
SET id_salida = obs_match.id_salida
FROM obs_match
WHERE m.id_movimiento = obs_match.id_movimiento;

WITH detail_match AS (
  SELECT m.id_movimiento, d.id_detalle
  FROM movimientos_inv m
  INNER JOIN detalle_salidas d ON d.id_salida = m.id_salida
  WHERE m.id_salida IS NOT NULL
    AND d.id_producto = m.id_producto
    AND d.cantidad = m.cantidad
)
UPDATE movimientos_inv m
SET id_detalle_salida = detail_match.id_detalle
FROM detail_match
WHERE m.id_movimiento = detail_match.id_movimiento AND m.id_detalle_salida IS NULL;
