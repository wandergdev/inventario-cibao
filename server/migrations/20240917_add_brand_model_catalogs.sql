-- Migration: catálogo de marcas y modelos con valores genéricos

CREATE TABLE IF NOT EXISTS marcas (
  id_marca UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS modelos (
  id_modelo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_marca UUID NOT NULL REFERENCES marcas(id_marca),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  UNIQUE (id_marca, nombre)
);

INSERT INTO marcas (nombre, descripcion)
VALUES
  ('Genérica', 'Marca por defecto para productos existentes')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO modelos (id_marca, nombre, descripcion)
SELECT id_marca, 'Modelo genérico', 'Modelo por defecto'
FROM marcas
WHERE nombre = 'Genérica'
ON CONFLICT (id_marca, nombre) DO NOTHING;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS id_marca UUID,
  ADD COLUMN IF NOT EXISTS id_modelo UUID;

UPDATE productos
SET id_marca = (SELECT id_marca FROM marcas WHERE nombre = 'Genérica' LIMIT 1)
WHERE id_marca IS NULL;

UPDATE productos
SET id_modelo = (
  SELECT id_modelo FROM modelos WHERE nombre = 'Modelo genérico' AND id_marca = productos.id_marca LIMIT 1
)
WHERE id_modelo IS NULL;

ALTER TABLE productos
  ALTER COLUMN id_marca SET NOT NULL,
  ALTER COLUMN id_modelo SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'productos' AND constraint_name = 'fk_producto_marca'
  ) THEN
    ALTER TABLE productos
      ADD CONSTRAINT fk_producto_marca FOREIGN KEY (id_marca) REFERENCES marcas(id_marca);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'productos' AND constraint_name = 'fk_producto_modelo'
  ) THEN
    ALTER TABLE productos
      ADD CONSTRAINT fk_producto_modelo FOREIGN KEY (id_modelo) REFERENCES modelos(id_modelo);
  END IF;
END
$$;
