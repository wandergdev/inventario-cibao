-- Inventario Cibao - Esquema inicial PostgreSQL
-- Ejecuta este script en la base de datos definida por DATABASE_URL.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Catálogos y tablas principales ---------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id_rol UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_rol VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  permisos JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  id_rol UUID NOT NULL REFERENCES roles(id_rol),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS suplidores (
  id_suplidor UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa VARCHAR(200) NOT NULL,
  direccion VARCHAR(255),
  telefono VARCHAR(20),
  contacto_vendedor VARCHAR(150),
  dias_credito INTEGER,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tipos_producto (
  id_tipo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS marcas (
  id_marca UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS modelos (
  id_modelo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_marca UUID NOT NULL REFERENCES marcas(id_marca),
  id_tipo_producto UUID NOT NULL REFERENCES tipos_producto(id_tipo),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  UNIQUE (id_marca, id_tipo_producto, nombre)
);

CREATE TABLE IF NOT EXISTS productos (
  id_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  id_tipo_producto UUID NOT NULL REFERENCES tipos_producto(id_tipo),
  id_marca UUID REFERENCES marcas(id_marca),
  id_modelo UUID REFERENCES modelos(id_modelo),
  precio_tienda NUMERIC(10,2) NOT NULL,
  precio_ruta NUMERIC(10,2) NOT NULL,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_no_disponible INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  stock_maximo INTEGER NOT NULL DEFAULT 0,
  id_suplidor UUID REFERENCES suplidores(id_suplidor),
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  motivo_no_disponible VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS salidas_alm (
  id_salida UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_vendedor UUID NOT NULL REFERENCES usuarios(id_usuario),
  fecha_salida TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_entrega DATE,
  total NUMERIC(10,2) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente de entrega',
  ticket VARCHAR(100) UNIQUE NOT NULL,
  ticket_numero INTEGER NOT NULL,
  tipo_salida VARCHAR(20) NOT NULL DEFAULT 'tienda',
  tipo_venta VARCHAR(20) NOT NULL DEFAULT 'contado',
  CONSTRAINT salidas_alm_estado_ticket_numero_key UNIQUE (estado, ticket_numero)
);

CREATE TABLE IF NOT EXISTS salida_estados (
  id_estado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_salidas_estado'
      AND table_name = 'salidas_alm'
  ) THEN
    ALTER TABLE salidas_alm
      ADD CONSTRAINT fk_salidas_estado
      FOREIGN KEY (estado) REFERENCES salida_estados(nombre) ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS salida_ticket_sequences (
  estado VARCHAR(50) PRIMARY KEY REFERENCES salida_estados(nombre) ON UPDATE CASCADE ON DELETE CASCADE,
  consecutivo INTEGER NOT NULL DEFAULT 0,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_estados (
  id_estado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  posicion INTEGER NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalle_salidas (
  id_detalle UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_salida UUID NOT NULL REFERENCES salidas_alm(id_salida) ON DELETE CASCADE,
  id_producto UUID NOT NULL REFERENCES productos(id_producto),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS movimientos_inv (
  id_movimiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID NOT NULL REFERENCES productos(id_producto),
  tipo_movimiento VARCHAR(50) NOT NULL,
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  id_usuario UUID NOT NULL REFERENCES usuarios(id_usuario),
  fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacion TEXT,
  id_salida UUID REFERENCES salidas_alm(id_salida) ON DELETE SET NULL,
  id_detalle_salida UUID REFERENCES detalle_salidas(id_detalle) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedidos_suplidores (
  id_pedido UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_producto UUID REFERENCES productos(id_producto),
  id_tipo_producto UUID NOT NULL REFERENCES tipos_producto(id_tipo),
  id_marca UUID REFERENCES marcas(id_marca),
  id_modelo UUID REFERENCES modelos(id_modelo),
  nombre_producto VARCHAR(200),
  id_suplidor UUID NOT NULL REFERENCES suplidores(id_suplidor),
  cantidad_solicitada INTEGER NOT NULL,
  fecha_pedido TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_esperada DATE,
  fecha_recibido DATE,
  estado VARCHAR(50) NOT NULL,
  id_usuario_solicita UUID NOT NULL REFERENCES usuarios(id_usuario)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pedidos_estado'
      AND table_name = 'pedidos_suplidores'
  ) THEN
    ALTER TABLE pedidos_suplidores
      ADD CONSTRAINT fk_pedidos_estado
      FOREIGN KEY (estado) REFERENCES pedido_estados(nombre) ON UPDATE CASCADE;
  END IF;
END $$;

-- Índices sugeridos -----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_roles_nombre ON roles(nombre_rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_salidas_fecha ON salidas_alm(fecha_salida);
CREATE INDEX IF NOT EXISTS idx_salidas_vendedor ON salidas_alm(id_vendedor);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inv(id_producto);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inv(fecha_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_id_salida ON movimientos_inv(id_salida);
CREATE INDEX IF NOT EXISTS idx_movimientos_id_detalle_salida ON movimientos_inv(id_detalle_salida);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_esperada ON pedidos_suplidores(fecha_esperada);

-- Datos base opcionales -------------------------------------------------------------
INSERT INTO roles (nombre_rol, descripcion)
VALUES
  ('Administrador', 'Acceso completo a la plataforma de inventario'),
  ('Vendedor', 'Gestiona consultas de productos y registro de salidas'),
  ('Vendedor Tienda', 'Gestiona salidas en tienda física'),
  ('Vendedor Ruta', 'Gestiona salidas en ruta'),
  ('Encargado de Tienda', 'Administra inventario y salidas'),
  ('Gerente General', 'Acceso completo al sistema')
ON CONFLICT (nombre_rol) DO NOTHING;

INSERT INTO tipos_producto (nombre, descripcion)
VALUES
  ('Televisor', 'Pantallas LED, LCD, OLED y QLED'),
  ('Refrigerador', 'Neveras y congeladores'),
  ('Lavadora', 'Lavadoras automáticas y semiautomáticas'),
  ('Aire acondicionado', 'Equipos tipo mini split o ventana'),
  ('Laptop', 'Computadoras portátiles'),
  ('Equipo de sonido', 'Bocinas y sistemas de audio')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO salida_estados (nombre, descripcion)
VALUES
  ('Pendiente de entrega', 'Salida registrada a la espera de ser entregada'),
  ('Apartado', 'Productos apartados o reservados para un cliente'),
  ('Entregado', 'Salida finalizada y entregada al cliente')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO pedido_estados (nombre, descripcion, posicion)
VALUES
  ('Solicitado', 'Pedido registrado en espera de confirmación', 1),
  ('Recibido', 'Pedido recibido en almacén', 2),
  ('Cancelado', 'Pedido cancelado por el equipo', 3)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO marcas (nombre, descripcion)
VALUES
  ('Samsung', 'Electrodomésticos y electrónica'),
  ('LG', 'Electrónica y electrodomésticos'),
  ('Whirlpool', 'Línea blanca'),
  ('Midea', 'Aire acondicionado y hogar'),
  ('Lenovo', 'Computadoras y dispositivos'),
  ('JBL', 'Audio profesional')
ON CONFLICT (nombre) DO NOTHING;

-- Modelos iniciales están fuera de alcance; se insertarán al crear productos.

DO $seed_admin$
DECLARE
  admin_role_id UUID;
BEGIN
  SELECT id_rol INTO admin_role_id FROM roles WHERE nombre_rol = 'Administrador' LIMIT 1;

  IF admin_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM usuarios WHERE email = 'gerente@electrocibao.com'
  ) THEN
    INSERT INTO usuarios (nombre, apellido, email, password, id_rol)
    VALUES (
      'Gerente',
      'General',
      'gerente@electrocibao.com',
      '$2a$10$gLuZNW7rv13lGi3wLOpMvux11F5aZ6fb.2ykdEQI9xlPpPwe0mw3O',
      admin_role_id
    );
  END IF;
END $seed_admin$;
