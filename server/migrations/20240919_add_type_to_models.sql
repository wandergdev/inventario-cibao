ALTER TABLE modelos
  ADD COLUMN IF NOT EXISTS id_tipo_producto UUID;

WITH product_types AS (
  SELECT DISTINCT ON (id_modelo) id_modelo, id_tipo_producto
  FROM productos
  WHERE id_modelo IS NOT NULL
  ORDER BY id_modelo, fecha_ingreso DESC
)
UPDATE modelos m
SET id_tipo_producto = pt.id_tipo_producto
FROM product_types pt
WHERE m.id_modelo = pt.id_modelo AND m.id_tipo_producto IS NULL;

WITH fallback AS (
  SELECT id_tipo FROM tipos_producto ORDER BY nombre ASC LIMIT 1
)
UPDATE modelos
SET id_tipo_producto = (SELECT id_tipo FROM fallback)
WHERE id_tipo_producto IS NULL;

ALTER TABLE modelos
  ALTER COLUMN id_tipo_producto SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE modelos
    ADD CONSTRAINT fk_modelo_tipo FOREIGN KEY (id_tipo_producto) REFERENCES tipos_producto(id_tipo);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE modelos
  DROP CONSTRAINT IF EXISTS modelos_id_marca_nombre_key;

DO $$
BEGIN
  ALTER TABLE modelos
    ADD CONSTRAINT modelos_brand_type_name UNIQUE (id_marca, id_tipo_producto, nombre);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
