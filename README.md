# Inventario Cibao

## Estructura inicial

El repositorio está dividido en dos carpetas: `web/` (frontend Next.js + Tailwind) y `server/` (backend Node.js con Express, PostgreSQL y JWT).

### Stack objetivo

- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js + Express
- Base de datos: PostgreSQL (cliente `pg`)
- Autenticación: JWT (con bcrypt para los hash)

```
inventario-cibao/
├── Documento_Proyecto_Inventario_Cibao.docx
├── README.md
├── web/
│   ├── package.json                # scripts de Next.js
│   ├── src/app/{layout,page,globals.css}
│   └── .env.example                # NEXT_PUBLIC_API_BASE_URL
└── server/
    ├── package.json                # scripts dev/build/start para Express
    ├── src/config/env.ts           # lectura de variables de entorno
    ├── src/db/pool.ts              # conexión Pool a PostgreSQL
    ├── src/routes/auth.ts          # endpoint POST /auth/login
    ├── src/docs/swagger.ts         # configuración OpenAPI
    ├── src/index.ts                # servidor Express + /health
    ├── db_schema.sql               # script SQL para crear tablas base
    └── create_database.sql         # script opcional para crear usuario/base inv_cibao
├── docs/
│   └── der.drawio                  # DER actualizado del sistema
```

## Backend (`server/`)

1. `cd server`
2. `npm install`
3. Copia `.env.example` a `.env` y edita:
   - `PORT` (por defecto 4000)
   - `DATABASE_URL` apuntando a tu instancia PostgreSQL
   - `JWT_SECRET` con una clave segura
   - `APP_PORTAL_URL` con la URL pública del frontend (se usa en correos)
   - (Opcional) `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` si quieres que el backend envíe por correo las credenciales de nuevos usuarios.
4. Levanta el backend: `npm run dev`
5. Verifica [http://localhost:4000/health](http://localhost:4000/health) y la documentación [http://localhost:4000/docs](http://localhost:4000/docs)
6. Para producción: `npm run build` y `npm start`
7. (Opcional pero recomendado) Ejecuta `npm run seed` para poblar los roles base (Administrador y Vendedor) y crear un usuario Administrador (`gerente@electrocibao.com / cibaoAdmin123`)

### Crear la base de datos

1. Si aún no tienes base ni usuario, ejecuta (como superusuario `postgres`):  
   ```bash
   psql -f server/create_database.sql
   ```  
   Esto crea el usuario `inventario_user` (clave `inventario_password`) y la base `inv_cibao`.
2. Ejecuta el script provisto con ese usuario:  
   ```bash
   psql \"postgresql://inventario_user:inventario_password@localhost:5432/inv_cibao\" -f server/db_schema.sql
   ```  
   Esto crea tablas, índices y roles iniciales.
3. Inserta usuarios con contraseñas encriptadas (puedes usar `bcryptjs` desde Node o herramientas externas) para probar `/auth/login`.

> Para crear las tablas y roles iniciales ejecuta `psql < server/db_schema.sql` (o el comando equivalente en tu cliente PostgreSQL) apuntando a la base definida en `DATABASE_URL`.

## Frontend (`web/`)

1. `cd web`
2. `npm install`
3. Copia `.env.example` a `.env.local` y ajusta `NEXT_PUBLIC_API_BASE_URL` al dominio del backend (ej. `http://localhost:4000`)
4. Ejecuta `npm run dev`
5. Abre [http://localhost:3000](http://localhost:3000)

> Inicia sesión directamente desde la pantalla principal (`/`); tras autenticarse se habilitan los paneles `/suppliers` y `/products` que consumen el backend.

### Endpoints actuales del backend

- `POST /auth/login`: recibe `{ email, password }` y responde con un JWT y los datos del usuario.
- `/users` (solo Administradores):
  - `GET /users`: listado de cuentas registradas.
  - `POST /users`: crea usuarios con nombre, apellido, email, password y rol (si hay SMTP configurado se notifica por correo).
  - `PATCH /users/:id`: actualiza datos, rol, estado o contraseña de cualquier usuario.
  - `PATCH /users/me/password`: cualquier usuario autenticado puede cambiar su contraseña desde Configuración.
  - `DELETE /users/:id`: solo el Gerente General puede eliminar usuarios (no puede eliminar a otro gerente).
- `/roles`:
  - `GET /roles`: lista los roles disponibles para mostrarlos en el frontend.
- `/suppliers`:
  - `GET /suppliers`: listado filtrable por búsqueda y estado. Disponible para cualquier usuario autenticado.
  - `POST /suppliers`, `PATCH /suppliers/:id`, `DELETE /suppliers/:id`: administración de suplidores (Encargado/Gerente).
- `/products`:
  - `GET /products`: listado filtrable por texto, suplidor o disponibilidad (vendedores y administradores).
  - `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`: administración de inventario (Encargado/Gerente).
- `/salidas`:
  - `POST /salidas`: registra una salida con detalles, ticket y actualiza inventario (vendedores y administradores).
  - `GET /salidas`: consulta las salidas recientes con filtros por estado, vendedor y rango de fechas.
- `/salida-statuses`: CRUD de estados disponibles para las salidas (solo administradores).
- `/pedidos`:
  - `GET /pedidos`: consulta pedidos a suplidores filtrando por estado, producto o fechas.
  - `POST /pedidos`: registra nuevas solicitudes de mercancía (solo administradores).
  - `PATCH /pedidos/:id`: permite marcar pedidos como recibidos o cancelados, así como ajustar fechas/cantidades.
- `/pedido-statuses`: CRUD de estados utilizados por los pedidos (solo administradores). Al crear un pedido se asigna automáticamente el primer estado activo configurado.
- `/movimientos`:
  - `GET /movimientos`: devuelve la trazabilidad de movimientos de inventario filtrando por producto, usuario, tipo y fechas.

Incluye el header `Authorization: Bearer <token>` en cada petición protegida. Añadiremos más módulos (productos, inventario, reportes) siguiendo el documento del proyecto.
