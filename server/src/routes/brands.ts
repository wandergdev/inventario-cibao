import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const brandsRouter = express.Router();

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

export default brandsRouter;
