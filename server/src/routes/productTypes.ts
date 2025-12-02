import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const productTypesRouter = express.Router();

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

export default productTypesRouter;
