-- Migration: add catalog of product types and link existing products
-- Ejecuta este script una sola vez sobre la base actualizada.

CREATE TABLE IF NOT EXISTS tipos_producto (
  id_tipo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

-- Insertar tipos base (en caso de no existir)
INSERT INTO tipos_producto (nombre, descripcion)
VALUES
  ('Televisor', 'Pantallas LED, LCD, OLED y QLED'),
  ('Refrigerador', 'Neveras y congeladores'),
  ('Lavadora', 'Lavadoras automáticas y semiautomáticas'),
  ('Aire acondicionado', 'Equipos tipo mini split o ventana'),
  ('Laptop', 'Computadoras portátiles'),
  ('Equipo de sonido', 'Bocinas y sistemas de audio'),
  ('General', 'Tipo genérico para productos existentes')
ON CONFLICT (nombre) DO NOTHING;

-- Crear columna para la FK si no existe
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS id_tipo_producto UUID;

-- Insertar dinámicamente los tipos existentes en la columna antigua
WITH nuevos_tipos AS (
  SELECT DISTINCT tipo_producto AS nombre
  FROM productos
  WHERE tipo_producto IS NOT NULL
)
INSERT INTO tipos_producto (nombre)
SELECT nombre
FROM nuevos_tipos nt
WHERE NOT EXISTS (SELECT 1 FROM tipos_producto t WHERE t.nombre = nt.nombre);

-- Actualizar cada producto para que apunte al id del tipo correspondiente
UPDATE productos p
SET id_tipo_producto = COALESCE(
  (SELECT id_tipo FROM tipos_producto WHERE nombre = p.tipo_producto LIMIT 1),
  (SELECT id_tipo FROM tipos_producto WHERE nombre = 'General' LIMIT 1)
)
WHERE id_tipo_producto IS NULL;

-- Asegurar integridad
ALTER TABLE productos
  ALTER COLUMN id_tipo_producto SET NOT NULL;

ALTER TABLE productos
  ADD CONSTRAINT IF NOT EXISTS fk_tipo_producto
    FOREIGN KEY (id_tipo_producto) REFERENCES tipos_producto(id_tipo);

-- Eliminar la columna antigua de texto
ALTER TABLE productos
  DROP COLUMN IF EXISTS tipo_producto;
