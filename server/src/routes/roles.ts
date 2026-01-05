import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const rolesRouter = express.Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: Listar roles disponibles
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   nombre:
 *                     type: string
 *       401:
 *         description: Token inválido
 *       403:
 *         description: Rol sin permisos
 */
rolesRouter.get("/", requireAuth(["Administrador"]), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT id_rol AS id, nombre_rol AS nombre
       FROM roles
       ORDER BY nombre_rol ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Error listando roles", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default rolesRouter;
