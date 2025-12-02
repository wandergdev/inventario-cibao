-- Migration: crear catálogos de marcas y modelos y enlazar productos

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
  ('Samsung', 'Electrodomésticos y electrónica'),
  ('LG', 'Electrónica y electrodomésticos'),
  ('Whirlpool', 'Línea blanca'),
  ('Midea', 'Aire acondicionado y hogar'),
  ('Lenovo', 'Computadoras y dispositivos'),
  ('JBL', 'Audio profesional'),
  ('Genérica', 'Marca por defecto')
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS id_marca UUID,
  ADD COLUMN IF NOT EXISTS id_modelo UUID;

-- Asignar marca genérica a productos existentes si no tienen una
UPDATE productos
SET id_marca = (SELECT id_marca FROM marcas WHERE nombre = 'Genérica' LIMIT 1)
WHERE id_marca IS NULL;

-- Crear modelo genérico por producto si no existe
UPDATE productos p
SET id_modelo = (
  SELECT id_modelo FROM modelos WHERE id_marca = p.id_marca AND nombre = COALESCE(p.modelo, 'Modelo genérico') LIMIT 1
)
WHERE id_modelo IS NULL AND (SELECT COUNT(*) FROM modelos WHERE id_marca = p.id_marca AND nombre = COALESCE(p.modelo, 'Modelo genérico')) > 0;

-- Insertar modelos faltantes
INSERT INTO modelos (id_marca, nombre)
SELECT p.id_marca, COALESCE(p.modelo, 'Modelo genérico')
FROM productos p
WHERE p.id_modelo IS NULL
ON CONFLICT (id_marca, nombre) DO NOTHING;

-- Asociar productos al modelo recién creado
UPDATE productos p
SET id_modelo = (
  SELECT id_modelo FROM modelos WHERE id_marca = p.id_marca AND nombre = COALESCE(p.modelo, 'Modelo genérico') LIMIT 1
)
WHERE p.id_modelo IS NULL;

ALTER TABLE productos
  ALTER COLUMN id_marca SET NOT NULL,
  ALTER COLUMN id_modelo SET NOT NULL,
  ADD CONSTRAINT IF NOT EXISTS fk_producto_marca FOREIGN KEY (id_marca) REFERENCES marcas(id_marca),
  ADD CONSTRAINT IF NOT EXISTS fk_producto_modelo FOREIGN KEY (id_modelo) REFERENCES modelos(id_modelo);

ALTER TABLE productos
  DROP COLUMN IF EXISTS marca,
  DROP COLUMN IF EXISTS modelo;
