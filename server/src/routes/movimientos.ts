import express from "express";
import type { Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const movimientosRouter = express.Router();
const adminRoles = ["Administrador"];

const baseSelect = `
  SELECT
    m.id_movimiento AS id,
    m.tipo_movimiento,
    m.cantidad,
    m.stock_anterior,
    m.stock_nuevo,
    m.fecha_movimiento,
    m.observacion,
    p.id_producto,
    p.nombre AS producto,
    u.id_usuario,
    u.nombre || ' ' || u.apellido AS usuario
  FROM movimientos_inv m
  INNER JOIN productos p ON p.id_producto = m.id_producto
  INNER JOIN usuarios u ON u.id_usuario = m.id_usuario
`;

const mapMovimiento = (row: any) => ({
  id: row.id,
  tipoMovimiento: row.tipo_movimiento,
  cantidad: row.cantidad,
  stockAnterior: row.stock_anterior,
  stockNuevo: row.stock_nuevo,
  fecha: row.fecha_movimiento,
  observacion: row.observacion,
  productoId: row.id_producto,
  producto: row.producto,
  usuarioId: row.id_usuario,
  usuario: row.usuario
});

/**
 * @openapi
 * /movimientos:
 *   get:
 *     summary: Listar movimientos de inventario
 *     tags:
 *       - Movimientos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Movimientos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Movimiento"
 */
movimientosRouter.get("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tipo, productId, userId, from, to } = req.query ?? {};
    const filters: string[] = [];
    const params: string[] = [];

    if (tipo) {
      filters.push(`m.tipo_movimiento = $${params.length + 1}`);
      params.push(tipo as string);
    }

    if (productId) {
      filters.push(`m.id_producto = $${params.length + 1}`);
      params.push(productId as string);
    }

    if (userId) {
      filters.push(`m.id_usuario = $${params.length + 1}`);
      params.push(userId as string);
    }

    if (from) {
      filters.push(`m.fecha_movimiento >= $${params.length + 1}`);
      params.push(from as string);
    }

    if (to) {
      filters.push(`m.fecha_movimiento <= $${params.length + 1}`);
      params.push(to as string);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const { rows } = await query(`${baseSelect} ${whereClause} ORDER BY m.fecha_movimiento DESC`, params);
    res.json(rows.map(mapMovimiento));
  } catch (error) {
    console.error("Error listando movimientos", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default movimientosRouter;
