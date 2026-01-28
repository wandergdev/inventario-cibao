WITH candidate AS (
  SELECT
    m.id_movimiento,
    s.id_salida,
    d.id_detalle,
    s.ticket,
    ROW_NUMBER() OVER (
      PARTITION BY m.id_movimiento
      ORDER BY ABS(EXTRACT(EPOCH FROM (m.fecha_movimiento - s.fecha_salida))) ASC
    ) AS rn
  FROM movimientos_inv m
  INNER JOIN detalle_salidas d ON d.id_producto = m.id_producto
  INNER JOIN salidas_alm s ON s.id_salida = d.id_salida
  WHERE m.tipo_movimiento = 'salida'
    AND m.id_salida IS NULL
)
UPDATE movimientos_inv m
SET
  id_salida = candidate.id_salida,
  id_detalle_salida = candidate.id_detalle,
  observacion = COALESCE(
    NULLIF(m.observacion, ''),
    'Salida ' || candidate.ticket
  )
FROM candidate
WHERE m.id_movimiento = candidate.id_movimiento
  AND candidate.rn = 1;
