import express from "express";
import type { Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { pool, query } from "../db/pool";
import { sendSaleNotificationEmail } from "../services/mailer";

const salidasRouter = express.Router();
const allowedRoles = ["Administrador", "Vendedor"];

type SalidaProducto = {
  productId: string;
  cantidad: number;
  precioUnitario?: number;
};

type CreateSalidaBody = {
  tipoSalida?: "tienda" | "ruta";
  tipoVenta?: "contado" | "credito";
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
const getActiveStates = async () => {
  const { rows } = await query(`SELECT nombre FROM salida_estados WHERE activo = true ORDER BY nombre ASC`);
  return rows.map((row) => row.nombre);
};

const getAdminEmails = async () => {
  const { rows } = await query(
    `SELECT u.email
     FROM usuarios u
     INNER JOIN roles r ON r.id_rol = u.id_rol
     WHERE r.nombre_rol = 'Administrador' AND u.activo = true`
  );
  return rows.map((row) => row.email as string).filter(Boolean);
};

const getUserFullName = async (userId: string) => {
  const { rows } = await query(`SELECT nombre, apellido FROM usuarios WHERE id_usuario = $1 LIMIT 1`, [userId]);
  if (!rows.length) {
    return null;
  }
  const nombre = rows[0].nombre ?? "";
  const apellido = rows[0].apellido ?? "";
  return `${nombre} ${apellido}`.trim() || nombre || apellido || null;
};

type SaleNotificationData = {
  ticket: string;
  total: number;
  estado: string;
  tipoVenta: string;
  vendedor: string;
  fecha: Date | string;
  detalles: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
};

const notifyAdminsOfSale = async (data: SaleNotificationData) => {
  try {
    const recipients = await getAdminEmails();
    if (!recipients.length) {
      return;
    }
    await sendSaleNotificationEmail({
      recipients,
      ...data
    });
  } catch (error) {
    console.error("No se pudo notificar a administradores sobre la salida", error);
  }
};

salidasRouter.post("/", requireAuth(allowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  const body = (req.body ?? {}) as CreateSalidaBody;
  const tipoSalida = body.tipoSalida ?? "tienda";
  const tipoVenta = body.tipoVenta ?? "contado";

  const estadosDisponibles = await getActiveStates();
  const defaultEstado = estadosDisponibles[0] ?? "Pendiente de entrega";
  const estado = body.estado ?? defaultEstado;

  if (!body.productos || body.productos.length === 0) {
    return res.status(400).json({ message: "Debes enviar al menos un producto" });
  }

  if (!estadosDisponibles.includes(estado)) {
    return res.status(400).json({ message: "Estado de salida no válido" });
  }

  const tokenUser = req.user;
  if (!tokenUser) {
    return res.status(401).json({ message: "Sesión inválida" });
  }

  const vendedorNombre = (await getUserFullName(tokenUser.id)) ?? tokenUser.email;
  const productIds = body.productos.map((p) => p.productId);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: productRows } = await client.query<{
      id_producto: string;
      nombre: string;
      stock_actual: number;
      precio_tienda: number;
      precio_ruta: number;
    }>(
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
      `INSERT INTO salidas_alm (id_vendedor, fecha_entrega, total, estado, ticket, tipo_salida, tipo_venta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_salida, fecha_salida`,
      [tokenUser.id, fechaEntrega, total, estado, ticket, tipoSalida, tipoVenta]
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

    void notifyAdminsOfSale({
      ticket,
      total,
      estado,
      tipoVenta,
      vendedor: vendedorNombre,
      fecha: salidaInsert.rows[0].fecha_salida,
      detalles: details
    });

    return res.status(201).json({
      id: salidaId,
      ticket,
      total,
      estado,
      tipoSalida,
      tipoVenta,
      tipo_venta: tipoVenta,
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

salidasRouter.patch("/:id", requireAuth(allowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { estado, fechaEntrega } = req.body ?? {};
    if (estado === undefined && fechaEntrega === undefined) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    const updates: string[] = [];
    const params: Array<any> = [];

    if (estado !== undefined) {
      const estadosDisponibles = await getActiveStates();
      if (!estadosDisponibles.includes(estado)) {
        return res.status(400).json({ message: "Estado de salida no válido" });
      }
      updates.push(`estado = $${updates.length + 1}`);
      params.push(estado);
    }

    if (fechaEntrega !== undefined) {
      const parsedDate = fechaEntrega ? new Date(fechaEntrega) : null;
      if (fechaEntrega && Number.isNaN(parsedDate?.getTime() ?? Number.NaN)) {
        return res.status(400).json({ message: "Fecha de entrega no válida" });
      }
      updates.push(`fecha_entrega = $${updates.length + 1}`);
      params.push(parsedDate);
    }

    params.push(id);

    const { rowCount } = await query(
      `UPDATE salidas_alm SET ${updates.join(", ")} WHERE id_salida = $${params.length}`,
      params
    );

    if (!rowCount) {
      return res.status(404).json({ message: "Salida no encontrada" });
    }

    res.json({ message: "Salida actualizada" });
  } catch (error) {
    console.error("Error actualizando salida", error);
    res.status(500).json({ message: "Error interno" });
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

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const buildReportWorkbook = (
  rows: Array<{ ticket: string; fecha_salida: Date; estado: string; tipo_venta: string; total: number; vendedor: string; productos: string }>,
  total: number,
  start: Date,
  end: Date
) => {
  const formatCurrency = (value: number) =>
    `RD$ ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  const rangeLabel = `${start.toLocaleDateString("es-DO")} - ${end.toLocaleDateString("es-DO")}`;
  const headerRow = `
    <Row>
      <Cell><Data ss:Type="String">Ticket</Data></Cell>
      <Cell><Data ss:Type="String">Fecha</Data></Cell>
      <Cell><Data ss:Type="String">Vendedor</Data></Cell>
      <Cell><Data ss:Type="String">Productos</Data></Cell>
      <Cell><Data ss:Type="String">Estado</Data></Cell>
      <Cell><Data ss:Type="String">Tipo venta</Data></Cell>
      <Cell><Data ss:Type="String">Monto</Data></Cell>
    </Row>`;

  const dataRows = rows.length
    ? rows
        .map(
      (row) => `
    <Row>
      <Cell><Data ss:Type="String">${escapeXml(row.ticket)}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(new Date(row.fecha_salida).toLocaleString("es-DO"))}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.vendedor ?? "Sin vendedor")}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.productos ?? "Sin productos")}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.estado ?? "")}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(row.tipo_venta ?? "")}</Data></Cell>
      <Cell><Data ss:Type="String">${escapeXml(formatCurrency(Number(row.total ?? 0)))}</Data></Cell>
    </Row>`
      )
      .join("")
    : `<Row><Cell ss:MergeAcross="6"><Data ss:Type="String">Sin salidas registradas para este rango.</Data></Cell></Row>`;

  const totalRow = `
    <Row>
      <Cell><Data ss:Type="String">Total ventas</Data></Cell>
      <Cell ss:MergeAcross="5"><Data ss:Type="String">${escapeXml(formatCurrency(total))}</Data></Cell>
    </Row>`;

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Salidas">
  <Table>
    <Row>
      <Cell ss:MergeAcross="5"><Data ss:Type="String">Reporte de salidas (${escapeXml(rangeLabel)})</Data></Cell>
    </Row>
    ${headerRow}
    ${dataRows}
    ${totalRow}
  </Table>
 </Worksheet>
</Workbook>`;
};

/**
 * @openapi
 * /salidas/report:
 *   get:
 *     summary: Descargar reporte de salidas en Excel
 *     tags:
 *       - Salidas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.ms-excel:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Error al generar el reporte
 */
salidasRouter.get("/report", requireAuth(["Administrador"]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { start, end } = req.query as { start?: string; end?: string };
    if (!start || !end) {
      return res.status(400).json({ message: "Debes especificar las fechas start y end (YYYY-MM-DD)" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Fechas inválidas" });
    }
    endDate.setHours(23, 59, 59, 999);

    const { rows: rangeRows } = await query(`SELECT MIN(fecha_salida) AS min_fecha, MAX(fecha_salida) AS max_fecha FROM salidas_alm`);
    const minFecha = rangeRows[0]?.min_fecha ? new Date(rangeRows[0].min_fecha) : null;
    const maxFecha = rangeRows[0]?.max_fecha ? new Date(rangeRows[0].max_fecha) : null;
    if (!minFecha || !maxFecha) {
      return res.status(400).json({ message: "Aún no existen salidas registradas para generar reportes." });
    }

    if (startDate < minFecha || endDate > maxFecha) {
      return res.status(400).json({
        message: `El rango debe estar entre ${minFecha.toLocaleDateString("es-DO")} y ${maxFecha.toLocaleDateString("es-DO")}.`
      });
    }

    const { rows } = await query(
      `SELECT s.ticket,
              s.fecha_salida,
              s.estado,
              s.tipo_venta,
              s.total,
              u.nombre || ' ' || u.apellido AS vendedor,
              COALESCE(
                string_agg(p.nombre || ' x' || d.cantidad, ', ' ORDER BY p.nombre),
                'Sin productos'
              ) AS productos
       FROM salidas_alm s
       INNER JOIN usuarios u ON u.id_usuario = s.id_vendedor
       LEFT JOIN detalle_salidas d ON d.id_salida = s.id_salida
       LEFT JOIN productos p ON p.id_producto = d.id_producto
       WHERE s.fecha_salida BETWEEN $1 AND $2
       GROUP BY s.id_salida, u.nombre, u.apellido
       ORDER BY s.fecha_salida ASC`,
      [startDate, endDate]
    );

    const total = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const workbook = buildReportWorkbook(
      rows as Array<{
        ticket: string;
        fecha_salida: Date;
        estado: string;
        tipo_venta: string;
        total: number;
        vendedor: string;
        productos: string;
      }>,
      total,
      startDate,
      endDate
    );

    const fileName = `reporte_salidas_${start}_${end}.xls`;
    (res as any).setHeader("Content-Type", "application/vnd.ms-excel");
    (res as any).setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(workbook);
  } catch (error) {
    console.error("Error generando reporte de salidas", error);
    res.status(500).json({ message: "No se pudo generar el reporte" });
  }
});

export default salidasRouter;
