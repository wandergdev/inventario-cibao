import bcrypt from "bcryptjs";
import { query, pool } from "../db/pool";

const roles = [
  {
    name: "Administrador",
    description: "Acceso a dashboard, reportes, inventario y configuración general"
  },
  {
    name: "Vendedor",
    description: "Gestiona consultas de productos, apartados y registro de salidas en ruta o tienda"
  }
];

const adminUser = {
  firstName: "Gerente",
  lastName: "General",
  email: "gerente@inventario.com",
  password: "cibaoAdmin123",
  roleName: "Administrador"
};

async function seed() {
  console.log("Seeding roles...");
  const roleIds: Record<string, string> = {};
  for (const role of roles) {
    const { rows } = await query(
      `INSERT INTO roles (nombre_rol, descripcion)
       VALUES ($1, $2)
       ON CONFLICT (nombre_rol) DO UPDATE SET descripcion = EXCLUDED.descripcion
       RETURNING id_rol, nombre_rol`,
      [role.name, role.description]
    );
    roleIds[rows[0].nombre_rol] = rows[0].id_rol;
  }

  console.log("Seeding admin user...");
  const { rows: existing } = await query(
    `SELECT id_usuario FROM usuarios WHERE email = $1 LIMIT 1`,
    [adminUser.email]
  );

  if (existing.length > 0) {
    console.log("Usuario administrador ya existe, omitiendo creación.");
  } else {
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    const roleId = roleIds[adminUser.roleName];
    await query(
      `INSERT INTO usuarios (nombre, apellido, email, password, id_rol)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminUser.firstName, adminUser.lastName, adminUser.email, hashedPassword, roleId]
    );
    console.log(`Usuario administrador creado: ${adminUser.email} / ${adminUser.password}`);
  }
}

seed()
  .catch((error) => {
    console.error("Error ejecutando seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
