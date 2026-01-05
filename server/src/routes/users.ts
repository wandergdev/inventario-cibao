import express from "express";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { sendCredentialsEmail } from "../services/mailer";

const usersRouter = express.Router();
const adminRoles = ["Administrador"];
const managerOnly = ["Administrador"];

type CreateUserBody = {
  nombre?: string;
  apellido?: string;
  email?: string;
  password?: string;
  roleName?: string;
  activo?: boolean;
};

type UpdateUserBody = {
  nombre?: string;
  apellido?: string;
  password?: string;
  roleName?: string;
  activo?: boolean;
};

type UserRow = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  role_name: string;
  activo: boolean;
  fecha_creacion: string;
};

const mapUser = (row: UserRow) => ({
  id: row.id,
  nombre: row.nombre,
  apellido: row.apellido,
  email: row.email,
  rol: row.role_name,
  activo: row.activo,
  fechaCreacion: row.fecha_creacion
});

const fetchRoleId = async (roleName: string) => {
  const { rows } = await query(`SELECT id_rol FROM roles WHERE nombre_rol = $1 LIMIT 1`, [roleName]);
  return rows.at(0)?.id_rol as string | undefined;
};

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Listar usuarios
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filtrar por nombre de rol
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/User"
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Rol sin permisos
 */
usersRouter.get("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roleFilter = req.query?.role;
    const activeFilter = req.query?.active;

    const conditions: string[] = [];
    const params: Array<string | boolean> = [];

    if (roleFilter) {
      conditions.push(`r.nombre_rol = $${params.length + 1}`);
      params.push(roleFilter);
    }

    if (activeFilter !== undefined) {
      conditions.push(`u.activo = $${params.length + 1}`);
      params.push(activeFilter === "true");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT u.id_usuario AS id, u.nombre, u.apellido, u.email, u.activo, u.fecha_creacion, r.nombre_rol AS role_name
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       ${whereClause}
       ORDER BY u.fecha_creacion DESC`,
      params
    );

    res.json(rows.map(mapUser));
  } catch (error) {
    console.error("Error listando usuarios", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Crear usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserCreateInput"
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *       400:
 *         description: Datos incompletos o rol inválido
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Rol sin permisos
 *       409:
 *         description: Email duplicado
 */
const allowedRolesForNewUser = ["Administrador", "Vendedor"];

usersRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, apellido, email, password, roleName } = (req.body || {}) as CreateUserBody;

    if (!nombre || !apellido || !email || !password || !roleName) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    if (!allowedRolesForNewUser.includes(roleName)) {
      return res.status(400).json({ message: "Solo se pueden crear usuarios Administradores o Vendedores" });
    }

    const roleId = await fetchRoleId(roleName);
    if (!roleId) {
      return res.status(400).json({ message: "Rol no válido" });
    }

    const plainPassword = password;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const { rows } = await query(
      `INSERT INTO usuarios (nombre, apellido, email, password, id_rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_usuario AS id, nombre, apellido, email, activo, fecha_creacion, $6::text AS role_name`,
      [nombre, apellido, email, hashedPassword, roleId, roleName]
    );

    const created = rows[0] as UserRow;

    const emailSent = await sendCredentialsEmail({
      to: email,
      name: `${nombre} ${apellido}`.trim(),
      password: plainPassword,
      role: roleName,
      senderEmail: req.user?.email
    });

    res.status(201).json({ user: mapUser(created), emailSent });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return res.status(409).json({ message: "El email ya está registrado" });
    }
    console.error("Error creando usuario", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Actualizar usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/UserUpdateInput"
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/User"
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Rol sin permisos
 *       404:
 *         description: Usuario no encontrado
 */
/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     summary: Actualizar contraseña propia
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Token inválido
 */
usersRouter.patch("/me/password", requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { newPassword } = (req.body || {}) as { newPassword?: string };
    if (!req.user) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }
    if (!newPassword) {
      return res.status(400).json({ message: "La nueva contraseña es requerida" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE usuarios SET password = $1 WHERE id_usuario = $2`, [hashed, req.user.id]);
    return res.json({ message: "Contraseña actualizada" });
  } catch (error) {
    console.error("Error actualizando contraseña", error);
    res.status(500).json({ message: "Error interno" });
  }
});

usersRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const body = (req.body || {}) as UpdateUserBody;
    const updates: string[] = [];
    const params: Array<string | boolean> = [];

    if (body.nombre) {
      updates.push(`nombre = $${updates.length + 1}`);
      params.push(body.nombre);
    }

    if (body.apellido) {
      updates.push(`apellido = $${updates.length + 1}`);
      params.push(body.apellido);
    }

    if (body.password) {
      const hashed = await bcrypt.hash(body.password, 10);
      updates.push(`password = $${updates.length + 1}`);
      params.push(hashed);
    }

    if (typeof body.activo === "boolean") {
      updates.push(`activo = $${updates.length + 1}`);
      params.push(body.activo);
    }

    if (body.roleName) {
      const roleId = await fetchRoleId(body.roleName);
      if (!roleId) {
        return res.status(400).json({ message: "Rol no válido" });
      }
      updates.push(`id_rol = $${updates.length + 1}`);
      params.push(roleId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);

    const { rows } = await query(
      `UPDATE usuarios
       SET ${updates.join(", ")}
       WHERE id_usuario = $${params.length}
       RETURNING id_usuario AS id, nombre, apellido, email, activo, fecha_creacion,
         (SELECT nombre_rol FROM roles r WHERE r.id_rol = usuarios.id_rol) AS role_name`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(mapUser(rows[0] as UserRow));
  } catch (error) {
    console.error("Error actualizando usuario", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Eliminar usuario
 *     tags:
 *       - Usuarios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Usuario eliminado
 *       400:
 *         description: ID faltante
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Acción no permitida
 *       404:
 *         description: Usuario no encontrado
 */
usersRouter.delete("/:id", requireAuth(managerOnly), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { rows } = await query(
      `SELECT u.id_usuario AS id, r.nombre_rol AS role_name
       FROM usuarios u
       INNER JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = $1`,
      [id]
    );

    const user = rows.at(0);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.role_name === "Gerente General") {
      return res.status(403).json({ message: "No se puede eliminar al Gerente General" });
    }

    await query(`DELETE FROM usuarios WHERE id_usuario = $1`, [id]);
    return res.status(204).send();
  } catch (error) {
    console.error("Error eliminando usuario", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default usersRouter;
