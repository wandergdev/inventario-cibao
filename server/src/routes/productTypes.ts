import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const productTypesRouter = express.Router();
const adminRoles = ["Administrador"];

/**
 * @openapi
 * /product-types:
 *   get:
 *     summary: Listar tipos de producto disponibles
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ProductType"
 */
productTypesRouter.get("/", requireAuth(), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`SELECT id_tipo AS id, nombre, descripcion FROM tipos_producto ORDER BY nombre ASC`);
    res.json(rows);
  } catch (error) {
    console.error("Error listando tipos de producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /product-types:
 *   post:
 *     summary: Crear tipo de producto
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProductTypeInput"
 *     responses:
 *       201:
 *         description: Tipo creado
 */
productTypesRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, descripcion } = req.body ?? {};
    const cleanName = typeof nombre === "string" ? nombre.trim() : "";
    if (!cleanName) {
      return res.status(400).json({ message: "Nombre requerido" });
    }

    const cleanDescription = typeof descripcion === "string" ? descripcion.trim() : null;
    const { rows } = await query(
      `INSERT INTO tipos_producto (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id_tipo AS id, nombre, descripcion`,
      [cleanName, cleanDescription]
    );
    res.status(201).json(rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un tipo con ese nombre" });
    }
    console.error("Error creando tipo de producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /product-types/{id}:
 *   patch:
 *     summary: Actualizar tipo de producto
 *     tags:
 *       - Productos
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
 *             $ref: "#/components/schemas/ProductTypeInput"
 *     responses:
 *       200:
 *         description: Tipo actualizado
 */
productTypesRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { nombre, descripcion } = req.body ?? {};
    const updates: string[] = [];
    const params: Array<string | null> = [];

    if (nombre !== undefined) {
      const cleanName = typeof nombre === "string" ? nombre.trim() : "";
      if (!cleanName) {
        return res.status(400).json({ message: "Nombre requerido" });
      }
      updates.push(`nombre = $${updates.length + 1}`);
      params.push(cleanName);
    }

    if (descripcion !== undefined) {
      const cleanDescription = typeof descripcion === "string" ? descripcion.trim() : null;
      updates.push(`descripcion = $${updates.length + 1}`);
      params.push(cleanDescription);
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);
    const { rows } = await query(
      `UPDATE tipos_producto SET ${updates.join(", ")} WHERE id_tipo = $${params.length} RETURNING id_tipo AS id, nombre, descripcion`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Tipo no encontrado" });
    }

    res.json(rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un tipo con ese nombre" });
    }
    console.error("Error actualizando tipo de producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /product-types/{id}:
 *   delete:
 *     summary: Eliminar tipo de producto
 *     tags:
 *       - Productos
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
 *         description: Eliminado
 */
productTypesRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const usage = await query(`SELECT 1 FROM productos WHERE id_tipo_producto = $1 LIMIT 1`, [id]);
    if (usage.rowCount) {
      return res.status(409).json({ message: "No puedes eliminar un tipo vinculado a productos" });
    }

    const result = await query(`DELETE FROM tipos_producto WHERE id_tipo = $1`, [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Tipo no encontrado" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando tipo de producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default productTypesRouter;
