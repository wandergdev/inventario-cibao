import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const brandsRouter = express.Router();
const adminRoles = ["Administrador"];

/**
 * @openapi
 * /brands:
 *   get:
 *     summary: Listar marcas registradas
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de marcas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Brand"
 */
brandsRouter.get("/", requireAuth(), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`SELECT id_marca AS id, nombre, descripcion FROM marcas ORDER BY nombre ASC`);
    res.json(rows);
  } catch (error) {
    console.error("Error listando marcas", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /brands:
 *   post:
 *     summary: Registrar marca
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/BrandInput"
 *     responses:
 *       201:
 *         description: Marca creada
 */
brandsRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, descripcion } = req.body ?? {};
    const cleanName = typeof nombre === "string" ? nombre.trim() : "";
    if (!cleanName) {
      return res.status(400).json({ message: "Nombre requerido" });
    }

    const cleanDescription = typeof descripcion === "string" ? descripcion.trim() : null;
    const { rows } = await query(
      `INSERT INTO marcas (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id_marca AS id, nombre, descripcion`,
      [cleanName, cleanDescription]
    );
    res.status(201).json(rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe una marca con ese nombre" });
    }
    console.error("Error creando marca", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /brands/{id}:
 *   patch:
 *     summary: Actualizar marca
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
 *             $ref: "#/components/schemas/BrandInput"
 *     responses:
 *       200:
 *         description: Marca actualizada
 */
brandsRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
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
      `UPDATE marcas SET ${updates.join(", ")} WHERE id_marca = $${params.length} RETURNING id_marca AS id, nombre, descripcion`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Marca no encontrada" });
    }

    res.json(rows[0]);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe una marca con ese nombre" });
    }
    console.error("Error actualizando marca", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /brands/{id}:
 *   delete:
 *     summary: Eliminar marca
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
 *         description: Eliminada
 */
brandsRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const referencedByProducts = await query(`SELECT 1 FROM productos WHERE id_marca = $1 LIMIT 1`, [id]);
    if (referencedByProducts.rowCount) {
      return res.status(409).json({ message: "No puedes eliminar una marca asociada a productos" });
    }

    const referencedByModels = await query(`SELECT 1 FROM modelos WHERE id_marca = $1 LIMIT 1`, [id]);
    if (referencedByModels.rowCount) {
      return res.status(409).json({ message: "Primero elimina los modelos asociados a esta marca" });
    }

    const result = await query(`DELETE FROM marcas WHERE id_marca = $1`, [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Marca no encontrada" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando marca", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default brandsRouter;
