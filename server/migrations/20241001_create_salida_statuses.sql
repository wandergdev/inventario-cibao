CREATE TABLE IF NOT EXISTS salida_estados (
  id_estado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO salida_estados (nombre, descripcion)
VALUES
  ('Pendiente de entrega', 'Salida registrada a la espera de ser entregada'),
  ('Apartado', 'Productos apartados o reservados para un cliente'),
  ('Entregado', 'Salida finalizada y entregada al cliente')
ON CONFLICT (nombre) DO NOTHING;

UPDATE salidas_alm
SET estado = 'Pendiente de entrega'
WHERE LOWER(estado) IN ('pendiente', 'pendiente de entrega');

UPDATE salidas_alm
SET estado = 'Entregado'
WHERE LOWER(estado) IN ('entregada', 'entregado');

ALTER TABLE salidas_alm
  ALTER COLUMN estado TYPE VARCHAR(50),
  ALTER COLUMN estado SET DEFAULT 'Pendiente de entrega';

ALTER TABLE salidas_alm
  ADD CONSTRAINT fk_salidas_estado
  FOREIGN KEY (estado) REFERENCES salida_estados(nombre) ON UPDATE CASCADE;
