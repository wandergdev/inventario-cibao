import express from "express";
import type { Request, Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const suppliersRouter = express.Router();
const adminRoles = ["Encargado de Tienda", "Gerente General"];

type SupplierRow = {
  id: string;
  nombre_empresa: string;
  direccion?: string;
  telefono?: string;
  contacto_vendedor?: string;
  dias_credito?: number;
  activo: boolean;
  fecha_registro: string;
};

const mapSupplier = (row: SupplierRow) => ({
  id: row.id,
  nombreEmpresa: row.nombre_empresa,
  direccion: row.direccion,
  telefono: row.telefono,
  contactoVendedor: row.contacto_vendedor,
  diasCredito: row.dias_credito,
  activo: row.activo,
  fechaRegistro: row.fecha_registro
});

/**
 * @openapi
 * /suppliers:
 *   get:
 *     summary: Listar suplidores
 *     tags:
 *       - Suplidores
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre de empresa o contacto
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo
 *     responses:
 *       200:
 *         description: Lista de suplidores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Supplier"
 */
suppliersRouter.get("/", requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, active } = req.query ?? {};
    const conditions: string[] = [];
    const params: Array<string | boolean> = [];

    if (search) {
      conditions.push(`(LOWER(nombre_empresa) LIKE LOWER($${params.length + 1}) OR LOWER(contacto_vendedor) LIKE LOWER($${params.length + 1}))`);
      params.push(`%${search}%`);
    }

    if (active !== undefined) {
      conditions.push(`activo = $${params.length + 1}`);
      params.push(active === "true");
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT id_suplidor AS id, nombre_empresa, direccion, telefono, contacto_vendedor, dias_credito, activo, fecha_registro
       FROM suplidores
       ${whereClause}
       ORDER BY nombre_empresa ASC`,
      params
    );

    res.json(rows.map(mapSupplier));
  } catch (error) {
    console.error("Error listando suplidores", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /suppliers:
 *   post:
 *     summary: Crear suplidor
 *     tags:
 *       - Suplidores
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SupplierInput"
 *     responses:
 *       201:
 *         description: Suplidor creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Supplier"
 */
suppliersRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombreEmpresa, direccion, telefono, contactoVendedor, diasCredito, activo = true } = req.body ?? {};

    if (!nombreEmpresa) {
      return res.status(400).json({ message: "El nombre del suplidor es obligatorio" });
    }

    const { rows } = await query(
      `INSERT INTO suplidores (nombre_empresa, direccion, telefono, contacto_vendedor, dias_credito, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_suplidor AS id, nombre_empresa, direccion, telefono, contacto_vendedor, dias_credito, activo, fecha_registro`,
      [nombreEmpresa, direccion, telefono, contactoVendedor, diasCredito, activo]
    );

    res.status(201).json(mapSupplier(rows[0] as SupplierRow));
  } catch (error) {
    console.error("Error creando suplidor", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /suppliers/{id}:
 *   patch:
 *     summary: Actualizar suplidor
 *     tags:
 *       - Suplidores
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
 *             $ref: "#/components/schemas/SupplierInput"
 *     responses:
 *       200:
 *         description: Suplidor actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Supplier"
 */
suppliersRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const body = req.body ?? {};
    const updates: string[] = [];
    const params: Array<string | number | boolean> = [];

    const fields: Record<string, string> = {
      nombreEmpresa: "nombre_empresa",
      direccion: "direccion",
      telefono: "telefono",
      contactoVendedor: "contacto_vendedor",
      diasCredito: "dias_credito",
      activo: "activo"
    };

    Object.entries(fields).forEach(([key, column]) => {
      if (body[key] !== undefined) {
        updates.push(`${column} = $${updates.length + 1}`);
        params.push(body[key]);
      }
    });

    if (!updates.length) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);
    const { rows } = await query(
      `UPDATE suplidores
       SET ${updates.join(", ")}
       WHERE id_suplidor = $${params.length}
       RETURNING id_suplidor AS id, nombre_empresa, direccion, telefono, contacto_vendedor, dias_credito, activo, fecha_registro`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Suplidor no encontrado" });
    }

    res.json(mapSupplier(rows[0] as SupplierRow));
  } catch (error) {
    console.error("Error actualizando suplidor", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /suppliers/{id}:
 *   delete:
 *     summary: Eliminar suplidor
 *     tags:
 *       - Suplidores
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
 *         description: Suplidor eliminado
 */
suppliersRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const result = await query(`DELETE FROM suplidores WHERE id_suplidor = $1`, [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Suplidor no encontrado" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error eliminando suplidor", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default suppliersRouter;
