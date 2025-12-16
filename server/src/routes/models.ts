import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const modelsRouter = express.Router();
const adminRoles = ["Administrador"];

const selectBase = `
  SELECT mo.id_modelo AS id,
         mo.id_marca AS "brandId",
         ma.nombre AS "brandName",
         mo.nombre,
         mo.descripcion
  FROM modelos mo
  JOIN marcas ma ON ma.id_marca = mo.id_marca
`;

const mapModel = (row: any) => ({
  id: row.id,
  brandId: row.brandId,
  brandName: row.brandName,
  nombre: row.nombre,
  descripcion: row.descripcion
});

/**
 * @openapi
 * /models:
 *   get:
 *     summary: Listar modelos por marca
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filtrar modelos por marca
 *     responses:
 *       200:
 *         description: Listado de modelos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Model"
 */
modelsRouter.get("/", requireAuth(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brandId = req.query?.brandId as string | undefined;
    const params: string[] = [];
    let whereClause = "";

    if (brandId) {
      whereClause = "WHERE mo.id_marca = $1";
      params.push(brandId as string);
    }

    const { rows } = await query(`${selectBase} ${whereClause} ORDER BY mo.nombre ASC`, params);
    res.json(rows.map(mapModel));
  } catch (error) {
    console.error("Error listando modelos", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /models:
 *   post:
 *     summary: Registrar modelo
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ModelInput"
 *     responses:
 *       201:
 *         description: Modelo creado
 */
modelsRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { brandId, nombre, descripcion } = req.body ?? {};
    if (!brandId) {
      return res.status(400).json({ message: "La marca es requerida" });
    }

    const cleanName = typeof nombre === "string" ? nombre.trim() : "";
    if (!cleanName) {
      return res.status(400).json({ message: "Nombre requerido" });
    }

    const brandResult = await query(`SELECT nombre FROM marcas WHERE id_marca = $1`, [brandId]);
    if (!brandResult.rowCount) {
      return res.status(400).json({ message: "Marca no existente" });
    }

    const cleanDescription = typeof descripcion === "string" ? descripcion.trim() : null;
    const { rows } = await query(
      `INSERT INTO modelos (id_marca, nombre, descripcion)
       VALUES ($1, $2, $3)
       RETURNING id_modelo AS id, id_marca AS "brandId", nombre, descripcion`,
      [brandId, cleanName, cleanDescription]
    );

    res.status(201).json({ ...rows[0], brandName: brandResult.rows[0].nombre });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un modelo con ese nombre para esta marca" });
    }
    console.error("Error creando modelo", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /models/{id}:
 *   patch:
 *     summary: Actualizar modelo
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
 *             $ref: "#/components/schemas/ModelInput"
 *     responses:
 *       200:
 *         description: Modelo actualizado
 */
modelsRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { brandId, nombre, descripcion } = req.body ?? {};
    const updates: string[] = [];
    const params: Array<string | null> = [];
    let brandName: string | undefined;

    if (brandId !== undefined) {
      if (!brandId) {
        return res.status(400).json({ message: "La marca es requerida" });
      }
      const brandResult = await query(`SELECT nombre FROM marcas WHERE id_marca = $1`, [brandId]);
      if (!brandResult.rowCount) {
        return res.status(400).json({ message: "Marca no existente" });
      }
      brandName = brandResult.rows[0].nombre;
      updates.push(`id_marca = $${updates.length + 1}`);
      params.push(brandId);
    }

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
      `UPDATE modelos SET ${updates.join(", ")} WHERE id_modelo = $${params.length}
       RETURNING id_modelo AS id, id_marca AS "brandId", nombre, descripcion`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Modelo no encontrado" });
    }

    if (!brandName) {
      const brandResult = await query(`SELECT nombre FROM marcas WHERE id_marca = $1`, [rows[0].brandId]);
      brandName = brandResult.rows[0]?.nombre;
    }

    res.json({ ...rows[0], brandName });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un modelo con ese nombre para esta marca" });
    }
    console.error("Error actualizando modelo", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /models/{id}:
 *   delete:
 *     summary: Eliminar modelo
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
modelsRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const usage = await query(`SELECT 1 FROM productos WHERE id_modelo = $1 LIMIT 1`, [id]);
    if (usage.rowCount) {
      return res.status(409).json({ message: "No puedes eliminar un modelo asociado a productos" });
    }

    const result = await query(`DELETE FROM modelos WHERE id_modelo = $1`, [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Modelo no encontrado" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando modelo", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default modelsRouter;
