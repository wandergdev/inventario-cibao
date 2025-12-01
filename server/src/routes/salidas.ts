import express from "express";
import type { Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { pool, query } from "../db/pool";

const salidasRouter = express.Router();
const allowedRoles = ["Administrador", "Vendedor"];

const SALIDA_STATES = ["pendiente", "entregada", "cancelada"];

type SalidaProducto = {
  productId: string;
  cantidad: number;
  precioUnitario?: number;
};

type CreateSalidaBody = {
  tipoSalida?: "tienda" | "ruta";
  fechaEntrega?: string;
  estado?: string;
  productos?: SalidaProducto[];
};

/**
 * @openapi
 * /salidas:
 *   post:
 *     summary: Registrar una salida de inventario
 *     tags:
 *       - Salidas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SalidaCreateInput"
 *     responses:
 *       201:
 *         description: Salida registrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Salida"
 */
salidasRouter.post("/", requireAuth(allowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  const body = (req.body ?? {}) as CreateSalidaBody;
  const tipoSalida = body.tipoSalida ?? "tienda";
  const estado = body.estado ?? "pendiente";

  if (!body.productos || body.productos.length === 0) {
    return res.status(400).json({ message: "Debes enviar al menos un producto" });
  }

  if (!SALIDA_STATES.includes(estado)) {
    return res.status(400).json({ message: "Estado de salida no válido" });
  }

  const tokenUser = req.user;
  if (!tokenUser) {
    return res.status(401).json({ message: "Sesión inválida" });
  }

  const productIds = body.productos.map((p) => p.productId);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: productRows } = await client.query(
      `SELECT id_producto, nombre, stock_actual, precio_tienda, precio_ruta
       FROM productos
       WHERE id_producto = ANY($1::uuid[])
       FOR UPDATE`,
      [productIds]
    );

    if (productRows.length !== productIds.length) {
      throw new Error("Algún producto no existe");
    }

    const productMap = new Map<string, typeof productRows[number]>();
    productRows.forEach((row) => productMap.set(row.id_producto, row));

    const details = body.productos.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error("Producto no encontrado");
      }
      if (item.cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }
      const unitPrice =
        item.precioUnitario ?? (tipoSalida === "ruta" ? Number(product.precio_ruta) : Number(product.precio_tienda));
      if (!unitPrice || unitPrice <= 0) {
        throw new Error("Precio de producto inválido");
      }
      if (product.stock_actual < item.cantidad) {
        throw new Error(`Stock insuficiente para ${product.nombre}`);
      }
      return {
        productId: item.productId,
        nombre: product.nombre,
        cantidad: item.cantidad,
        precioUnitario: unitPrice,
        subtotal: unitPrice * item.cantidad,
        stockAnterior: product.stock_actual,
        stockNuevo: product.stock_actual - item.cantidad
      };
    });

    const total = details.reduce((sum, detail) => sum + detail.subtotal, 0);
    const ticket = `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fechaEntrega = body.fechaEntrega ? new Date(body.fechaEntrega) : null;

    const salidaInsert = await client.query(
      `INSERT INTO salidas_alm (id_vendedor, fecha_entrega, total, estado, ticket, tipo_salida)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_salida, fecha_salida`,
      [tokenUser.id, fechaEntrega, total, estado, ticket, tipoSalida]
    );

    const salidaId = salidaInsert.rows[0].id_salida;

    for (const detail of details) {
      await client.query(
        `INSERT INTO detalle_salidas (id_salida, id_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [salidaId, detail.productId, detail.cantidad, detail.precioUnitario, detail.subtotal]
      );

      await client.query(`UPDATE productos SET stock_actual = $1 WHERE id_producto = $2`, [detail.stockNuevo, detail.productId]);

      await client.query(
        `INSERT INTO movimientos_inv (id_producto, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, id_usuario, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          detail.productId,
          "salida",
          detail.cantidad,
          detail.stockAnterior,
          detail.stockNuevo,
          tokenUser.id,
          `Salida ${ticket}`
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      id: salidaId,
      ticket,
      total,
      estado,
      tipoSalida,
      detalles: details
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error registrando salida", error);
    const message = error instanceof Error ? error.message : "Error al crear la salida";
    return res.status(400).json({ message });
  } finally {
    client.release();
  }
});

/**
 * @openapi
 * /salidas:
 *   get:
 *     summary: Listar salidas de inventario
 *     tags:
 *       - Salidas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendedorId
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
 *         description: Listado de salidas con detalles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Salida"
 */
salidasRouter.get("/", requireAuth(allowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { estado, vendedorId, from, to } = req.query ?? {};
    const filters: string[] = [];
    const params: Array<string> = [];

    if (estado) {
      filters.push(`s.estado = $${params.length + 1}`);
      params.push(estado as string);
    }

    if (vendedorId) {
      filters.push(`s.id_vendedor = $${params.length + 1}`);
      params.push(vendedorId as string);
    }

    if (from) {
      filters.push(`s.fecha_salida >= $${params.length + 1}`);
      params.push(from as string);
    }

    if (to) {
      filters.push(`s.fecha_salida <= $${params.length + 1}`);
      params.push(to as string);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT
         s.id_salida AS id,
         s.ticket,
         s.fecha_salida,
         s.fecha_entrega,
         s.total,
         s.estado,
         s.tipo_salida,
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
       ${whereClause}
       GROUP BY s.id_salida, u.nombre, u.apellido
       ORDER BY s.fecha_salida DESC
       LIMIT 50`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error("Error listando salidas", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default salidasRouter;
