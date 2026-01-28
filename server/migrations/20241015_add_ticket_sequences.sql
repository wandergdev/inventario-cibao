CREATE TABLE IF NOT EXISTS salida_ticket_sequences (
  estado VARCHAR(50) PRIMARY KEY REFERENCES salida_estados(nombre) ON UPDATE CASCADE ON DELETE CASCADE,
  consecutivo INTEGER NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE salidas_alm
  ADD COLUMN IF NOT EXISTS ticket_numero INTEGER;

WITH ranked AS (
  SELECT
    id_salida,
    estado,
    ROW_NUMBER() OVER (PARTITION BY estado ORDER BY fecha_salida, id_salida) AS seq
  FROM salidas_alm
)
UPDATE salidas_alm s
SET ticket_numero = ranked.seq
FROM ranked
WHERE ranked.id_salida = s.id_salida
  AND (s.ticket_numero IS NULL OR s.ticket_numero <> ranked.seq);

UPDATE salidas_alm
SET ticket_numero = 1
WHERE ticket_numero IS NULL;

ALTER TABLE salidas_alm
  ALTER COLUMN ticket_numero SET NOT NULL;

ALTER TABLE salidas_alm
  ADD CONSTRAINT salidas_alm_estado_ticket_numero_key UNIQUE (estado, ticket_numero);

INSERT INTO salida_ticket_sequences (estado, consecutivo)
SELECT estado, COALESCE(MAX(ticket_numero), 0)
FROM salidas_alm
GROUP BY estado
ON CONFLICT (estado) DO UPDATE
SET consecutivo = EXCLUDED.consecutivo,
    actualizado_en = NOW();

WITH formatted AS (
  SELECT
    id_salida,
    ticket_numero,
    COALESCE(
      NULLIF(
        regexp_replace(
          translate(upper(estado), 'ÁÉÍÓÚÜÑ', 'AEIOUUN'),
          '[^A-Z0-9]',
          '',
          'g'
        ),
        ''
      ),
      'TKT'
    ) AS prefix
  FROM salidas_alm
)
UPDATE salidas_alm s
SET ticket = formatted.prefix || '-' || LPAD(formatted.ticket_numero::text, 4, '0')
FROM formatted
WHERE formatted.id_salida = s.id_salida;
