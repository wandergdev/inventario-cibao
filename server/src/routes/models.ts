import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const modelsRouter = express.Router();

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
      whereClause = "WHERE id_marca = $1";
      params.push(brandId as string);
    }

    const { rows } = await query(
      `SELECT id_modelo AS id, id_marca AS "brandId", nombre, descripcion
       FROM modelos
       ${whereClause}
       ORDER BY nombre ASC`,
      params
    );
    res.json(rows);
  } catch (error) {
    console.error("Error listando modelos", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default modelsRouter;
