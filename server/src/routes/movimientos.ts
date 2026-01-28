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
    m.id_salida,
    m.id_detalle_salida,
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
  salidaId: row.id_salida,
  detalleSalidaId: row.id_detalle_salida,
  productoId: row.id_producto,
  producto: row.producto,
  usuarioId: row.id_usuario,
  usuario: row.usuario
});

const extractTicketFromObservation = (observacion?: string | null) => {
  if (!observacion) {
    return null;
  }
  const match = observacion.match(/Salida\s+([A-Z0-9\-]+)/i);
  return match?.[1] ?? null;
};

const findTicketCodeByContext = async (row: any) => {
  const fechaMov = row.fecha_movimiento;
  if (!fechaMov) {
    return null;
  }
  const { rows } = await query(
    `SELECT s.ticket
     FROM detalle_salidas d
     INNER JOIN salidas_alm s ON s.id_salida = d.id_salida
     WHERE d.id_producto = $1
       AND d.cantidad = $2
       AND s.fecha_salida BETWEEN $3::timestamptz - INTERVAL '10 day' AND $3::timestamptz + INTERVAL '10 day'
     ORDER BY ABS(EXTRACT(EPOCH FROM (s.fecha_salida - $3::timestamptz))) ASC
     LIMIT 1`,
    [row.id_producto, row.cantidad, fechaMov]
  );
  return rows[0]?.ticket ?? null;
};

const fetchSalidaDetail = async (whereClause: string, params: Array<any>) => {
  const { rows } = await query(
    `SELECT
       s.id_salida AS id,
       s.ticket,
       s.ticket_numero,
       s.fecha_salida,
       s.fecha_entrega,
       s.total,
       s.estado,
       s.tipo_salida,
       s.tipo_venta,
       u.nombre || ' ' || u.apellido AS vendedor,
       COALESCE(
         json_agg(
           json_build_object(
             'producto', p.nombre,
             'cantidad', d.cantidad,
             'precioUnitario', d.precio_unitario,
             'subtotal', d.subtotal
           )
         ) FILTER (WHERE d.id_detalle IS NOT NULL),
         '[]'
       ) AS detalles
     FROM salidas_alm s
     INNER JOIN usuarios u ON u.id_usuario = s.id_vendedor
     LEFT JOIN detalle_salidas d ON d.id_salida = s.id_salida
     LEFT JOIN productos p ON p.id_producto = d.id_producto
     WHERE ${whereClause}
     GROUP BY s.id_salida, u.nombre, u.apellido
     LIMIT 1`,
    params
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    ticket: row.ticket,
    ticket_numero: row.ticket_numero,
    fecha_salida: row.fecha_salida,
    fecha_entrega: row.fecha_entrega,
    total: row.total,
    estado: row.estado,
    tipo_salida: row.tipo_salida,
    tipo_venta: row.tipo_venta,
    tipoVenta: row.tipo_venta,
    vendedor: row.vendedor,
    detalles: row.detalles ?? []
  };
};

const fetchTicketDetailByCode = (ticket: string) => fetchSalidaDetail("s.ticket = $1", [ticket]);
const fetchTicketDetailById = (salidaId: string) => fetchSalidaDetail("s.id_salida = $1", [salidaId]);

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

movimientosRouter.get("/:id/detail", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { rows } = await query(`${baseSelect} WHERE m.id_movimiento = $1 LIMIT 1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Movimiento no encontrado" });
    }

    const movimientoRow = rows[0];
    const movimiento = mapMovimiento(movimientoRow);
    let ticketDetail = null;

    if (movimiento.tipoMovimiento === "salida") {
      if (movimiento.salidaId) {
        ticketDetail = await fetchTicketDetailById(movimiento.salidaId);
      } else {
        const ticketCode =
          extractTicketFromObservation(movimiento.observacion) ?? (await findTicketCodeByContext(movimientoRow));
        if (ticketCode) {
          ticketDetail = await fetchTicketDetailByCode(ticketCode);
          if (ticketDetail) {
            await query(`UPDATE movimientos_inv SET id_salida = $1 WHERE id_movimiento = $2`, [
              ticketDetail.id,
              movimiento.id
            ]);
          }
        }
      }
    }

    res.json({
      movimiento,
      ticket: ticketDetail
    });
  } catch (error) {
    console.error("Error obteniendo detalle de movimiento", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default movimientosRouter;
