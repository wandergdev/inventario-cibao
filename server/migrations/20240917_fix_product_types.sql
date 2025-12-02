-- Migration complementaria para asegurar que todos los productos tengan un tipo válido.

-- Asegura que el tipo "General" exista
INSERT INTO tipos_producto (nombre, descripcion)
VALUES ('General', 'Tipo genérico para productos existentes')
ON CONFLICT (nombre) DO NOTHING;

-- Añade columna si aún no existe
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS id_tipo_producto UUID;

-- Si la columna antigua tipo_producto existe, úsala para mapear
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'tipo_producto'
  ) THEN
    WITH nuevos_tipos AS (
      SELECT DISTINCT tipo_producto AS nombre
      FROM productos
      WHERE tipo_producto IS NOT NULL
    )
    INSERT INTO tipos_producto (nombre)
    SELECT nombre
    FROM nuevos_tipos nt
    WHERE NOT EXISTS (SELECT 1 FROM tipos_producto t WHERE t.nombre = nt.nombre);

    UPDATE productos p
    SET id_tipo_producto = (
      SELECT id_tipo FROM tipos_producto WHERE nombre = p.tipo_producto LIMIT 1
    )
    WHERE p.id_tipo_producto IS NULL AND p.tipo_producto IS NOT NULL;
  END IF;
END
$$;

-- Asigna el tipo "General" a los productos que queden sin tipo
UPDATE productos
SET id_tipo_producto = (SELECT id_tipo FROM tipos_producto WHERE nombre = 'General' LIMIT 1)
WHERE id_tipo_producto IS NULL;

-- Asegura NOT NULL y FK
ALTER TABLE productos
  ALTER COLUMN id_tipo_producto SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'productos'
      AND constraint_name = 'fk_tipo_producto'
  ) THEN
    ALTER TABLE productos
      ADD CONSTRAINT fk_tipo_producto FOREIGN KEY (id_tipo_producto) REFERENCES tipos_producto(id_tipo);
  END IF;
END
$$;

-- Elimina la columna antigua si existe
ALTER TABLE productos
  DROP COLUMN IF EXISTS tipo_producto;
