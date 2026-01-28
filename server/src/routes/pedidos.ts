import express from "express";
import type { Response } from "express";
import { pool, query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const pedidosRouter = express.Router();
const adminRoles = ["Administrador"];
const listAllowedRoles = ["Administrador", "Vendedor"];

const normalizeDateInput = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

type CreatePedidoBody = {
  productId?: string;
  supplierId?: string;
  cantidadSolicitada?: number;
  fechaEsperada?: string;
  productTypeId?: string;
  brandId?: string;
  modelId?: string;
  productNameHint?: string | null;
};

type UpdatePedidoBody = {
  estado?: string;
  cantidadSolicitada?: number;
  fechaEsperada?: string | null;
  fechaRecibido?: string | null;
};

const baseSelect = `
  SELECT
    p.id_pedido AS id,
    p.id_producto,
    prod.nombre AS producto,
    p.nombre_producto AS producto_referencia,
    p.id_tipo_producto,
    tp.nombre AS tipo_nombre,
    p.id_marca,
    br.nombre AS marca_nombre,
    p.id_modelo,
    mo.nombre AS modelo_nombre,
    p.id_suplidor,
    s.nombre_empresa AS suplidor,
    p.cantidad_solicitada,
    p.fecha_pedido,
    p.fecha_esperada,
    p.fecha_recibido,
    p.estado,
    p.id_usuario_solicita,
    u.nombre || ' ' || u.apellido AS solicitado_por
  FROM pedidos_suplidores p
  LEFT JOIN productos prod ON prod.id_producto = p.id_producto
  LEFT JOIN tipos_producto tp ON tp.id_tipo = p.id_tipo_producto
  LEFT JOIN marcas br ON br.id_marca = p.id_marca
  LEFT JOIN modelos mo ON mo.id_modelo = p.id_modelo
  INNER JOIN suplidores s ON s.id_suplidor = p.id_suplidor
  INNER JOIN usuarios u ON u.id_usuario = p.id_usuario_solicita
`;

const resolveProductoNombre = (row: any) => {
  if (row.producto) return row.producto;
  if (row.producto_referencia) return row.producto_referencia;
  const pieces = [];
  if (row.marca_nombre) {
    pieces.push(row.marca_nombre);
  }
  if (row.modelo_nombre) {
    pieces.push(row.modelo_nombre);
  }
  if (pieces.length) {
    return pieces.join(" • ");
  }
  if (row.tipo_nombre) {
    return `${row.tipo_nombre} pendiente`;
  }
  return "Producto pendiente";
};

const mapPedido = (row: any) => ({
  id: row.id,
  productoId: row.id_producto,
  producto: resolveProductoNombre(row),
  productoNombreReferencia: row.producto_referencia ?? null,
  tipoId: row.id_tipo_producto,
  tipoNombre: row.tipo_nombre ?? null,
  marcaId: row.id_marca ?? null,
  marcaNombre: row.marca_nombre ?? null,
  modeloId: row.id_modelo ?? null,
  modeloNombre: row.modelo_nombre ?? null,
  suplidorId: row.id_suplidor,
  suplidor: row.suplidor,
  cantidadSolicitada: row.cantidad_solicitada,
  fechaPedido: row.fecha_pedido,
  fechaEsperada: row.fecha_esperada,
  fechaRecibido: row.fecha_recibido,
  estado: row.estado,
  usuarioId: row.id_usuario_solicita,
  solicitadoPor: row.solicitado_por
});

async function fetchPedidoById(id: string) {
  const { rows } = await query(`${baseSelect} WHERE p.id_pedido = $1`, [id]);
  return rows.at(0) ? mapPedido(rows[0]) : null;
}

async function fetchActivePedidoStates() {
  const { rows } = await query(`SELECT nombre FROM pedido_estados WHERE activo = true ORDER BY posicion ASC, nombre ASC`);
  return rows.map((row) => row.nombre as string);
}

async function fetchDefaultPedidoState() {
  const states = await fetchActivePedidoStates();
  return states.at(0) ?? null;
}

/**
 * @openapi
 * /pedidos:
 *   get:
 *     summary: Listar pedidos realizados a suplidores
 *     tags:
 *       - Pedidos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *       - in: query
 *         name: productId
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
 *         description: Listado de pedidos a suplidores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Pedido"
 */
pedidosRouter.get("/", requireAuth(listAllowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { estado, supplierId, productId, from, to } = req.query ?? {};
    const filters: string[] = [];
    const params: string[] = [];

    if (estado) {
      filters.push(`p.estado = $${params.length + 1}`);
      params.push(estado as string);
    }

    if (supplierId) {
      filters.push(`p.id_suplidor = $${params.length + 1}`);
      params.push(supplierId as string);
    }

    if (productId) {
      filters.push(`p.id_producto = $${params.length + 1}`);
      params.push(productId as string);
    }

    if (from) {
      filters.push(`p.fecha_pedido >= $${params.length + 1}`);
      params.push(from as string);
    }

    if (to) {
      filters.push(`p.fecha_pedido <= $${params.length + 1}`);
      params.push(to as string);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const { rows } = await query(`${baseSelect} ${whereClause} ORDER BY p.fecha_pedido DESC LIMIT 100`, params);

    res.json(rows.map(mapPedido));
  } catch (error) {
    console.error("Error listando pedidos", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /pedidos:
 *   post:
 *     summary: Registrar un pedido a un suplidor
 *     tags:
 *       - Pedidos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PedidoCreateInput"
 *     responses:
 *       201:
 *         description: Pedido registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Pedido"
 */
pedidosRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      productId,
      supplierId,
      cantidadSolicitada,
      fechaEsperada,
      productTypeId,
      brandId,
      modelId,
      productNameHint
    } = (req.body ?? {}) as CreatePedidoBody;
    const tokenUser = req.user;

    if (!tokenUser) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!supplierId || !cantidadSolicitada) {
      return res.status(400).json({ message: "Suplidor y cantidad son obligatorios" });
    }

    if (!productTypeId || !brandId || !modelId) {
      return res.status(400).json({ message: "Debes seleccionar tipo, marca y modelo" });
    }

    if (cantidadSolicitada <= 0) {
      return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });
    }

    const { rowCount: supplierExists } = await query(`SELECT 1 FROM suplidores WHERE id_suplidor = $1`, [supplierId]);
    if (!supplierExists) {
      return res.status(400).json({ message: "Suplidor no existe" });
    }

    const defaultEstado = await fetchDefaultPedidoState();
    if (!defaultEstado) {
      return res.status(400).json({ message: "Configura al menos un estado de pedido antes de crear solicitudes" });
    }

    const { rows: modelRows } = await query(
      `SELECT mo.id_modelo, mo.id_marca, mo.id_tipo_producto, mo.nombre AS modelo_nombre, ma.nombre AS marca_nombre
       FROM modelos mo
       LEFT JOIN marcas ma ON ma.id_marca = mo.id_marca
       WHERE mo.id_modelo = $1`,
      [modelId]
    );
    if (!modelRows.length) {
      return res.status(400).json({ message: "Modelo no válido" });
    }

    const modeloInfo = modelRows[0];
    if (modeloInfo.id_marca !== brandId) {
      return res.status(400).json({ message: "El modelo no pertenece a la marca indicada" });
    }
    if (modeloInfo.id_tipo_producto !== productTypeId) {
      return res.status(400).json({ message: "El modelo no pertenece al tipo de producto indicado" });
    }

    let finalProductId = productId ?? null;
    let referenceNombre = productNameHint?.trim() || null;
    let referenceTipo = productTypeId;
    let referenceMarca = brandId;
    let referenceModelo = modelId;

    if (finalProductId) {
      const {
        rows: productRows
      } = await query(
        `SELECT id_producto, id_tipo_producto, id_marca, id_modelo, nombre
         FROM productos
         WHERE id_producto = $1`,
        [finalProductId]
      );
      if (!productRows.length) {
        return res.status(400).json({ message: "Producto no existe" });
      }
      const productInfo = productRows[0];
      referenceTipo = productInfo.id_tipo_producto;
      referenceMarca = productInfo.id_marca;
      referenceModelo = productInfo.id_modelo;
      referenceNombre = productInfo.nombre;
    } else {
      const { rows: existingProducts } = await query(
        `SELECT id_producto, nombre
         FROM productos
         WHERE id_tipo_producto = $1 AND id_marca = $2 AND id_modelo = $3
         LIMIT 1`,
        [productTypeId, brandId, modelId]
      );
      if (existingProducts.length) {
        finalProductId = existingProducts[0].id_producto;
        referenceNombre = existingProducts[0].nombre;
      }
    }

    if (!referenceNombre) {
      const brandLabel = modeloInfo.marca_nombre ?? "";
      const modelLabel = modeloInfo.modelo_nombre ?? "";
      const combined = `${brandLabel} ${modelLabel}`.trim();
      referenceNombre = combined || "Producto pendiente";
    }

    const normalizedFecha = normalizeDateInput(fechaEsperada);

    const duplicateParams: Array<string | number | null> = [supplierId, cantidadSolicitada, normalizedFecha ?? null, defaultEstado];
    let duplicateQuery = `
      SELECT id_pedido
      FROM pedidos_suplidores
      WHERE id_suplidor = $1
        AND cantidad_solicitada = $2
        AND (
          (fecha_esperada IS NULL AND $3::date IS NULL) OR
          (fecha_esperada = $3::date)
        )
        AND estado = $4
    `;

    if (finalProductId) {
      duplicateQuery += ` AND id_producto = $${duplicateParams.length + 1}`;
      duplicateParams.push(finalProductId);
    } else {
      duplicateQuery += ` AND id_producto IS NULL AND id_tipo_producto = $${duplicateParams.length + 1} AND id_marca = $${duplicateParams.length + 2} AND id_modelo = $${duplicateParams.length + 3}`;
      duplicateParams.push(referenceTipo, referenceMarca, referenceModelo);
    }

    const { rows: duplicateRows } = await query(`${duplicateQuery} LIMIT 1`, duplicateParams);

    if (duplicateRows.length) {
      return res.status(409).json({
        message: "Ya existe un pedido pendiente con los mismos datos. Edita el que ya tienes registrado."
      });
    }

    const { rows } = await query(
      `INSERT INTO pedidos_suplidores (
         id_producto,
         id_suplidor,
         cantidad_solicitada,
         fecha_esperada,
         estado,
         id_usuario_solicita,
         id_tipo_producto,
         id_marca,
         id_modelo,
         nombre_producto
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id_pedido`,
      [
        finalProductId,
        supplierId,
        cantidadSolicitada,
        normalizedFecha ?? null,
        defaultEstado,
        tokenUser.id,
        referenceTipo,
        referenceMarca,
        referenceModelo,
        referenceNombre
      ]
    );

    const pedido = await fetchPedidoById(rows[0].id_pedido);
    return res.status(201).json(pedido);
  } catch (error) {
    console.error("Error creando pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /pedidos/{id}:
 *   patch:
 *     summary: Actualizar un pedido
 *     tags:
 *       - Pedidos
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
 *             $ref: "#/components/schemas/PedidoUpdateInput"
 *     responses:
 *       200:
 *         description: Pedido actualizado
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: Pedido no encontrado
 */
pedidosRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params ?? {};
    if (!id) {
      client.release();
      return res.status(400).json({ message: "ID requerido" });
    }

    const body = (req.body ?? {}) as UpdatePedidoBody;
    const tokenUser = req.user;
    if (!tokenUser) {
      client.release();
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    await client.query("BEGIN");
    const {
      rows: currentRows
    } = await client.query<{
      id_producto: string;
      cantidad_solicitada: number;
      estado: string;
      id_tipo_producto: string;
      id_marca: string | null;
      id_modelo: string | null;
      nombre_producto: string | null;
      id_suplidor: string;
    }>(
      `SELECT id_producto, cantidad_solicitada, estado, id_tipo_producto, id_marca, id_modelo, nombre_producto, id_suplidor
       FROM pedidos_suplidores
       WHERE id_pedido = $1
       FOR UPDATE`,
      [id]
    );

    if (!currentRows.length) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const current = currentRows[0];

    if (current.estado === "recibido" && body.cantidadSolicitada !== undefined && !body.estado) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(400)
        .json({ message: "No puedes ajustar la cantidad de un pedido recibido sin cambiar su estado." });
    }

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    let targetCantidad = current.cantidad_solicitada;
    let targetEstado = current.estado;

    if (body.cantidadSolicitada !== undefined) {
      if (body.cantidadSolicitada === null || body.cantidadSolicitada <= 0) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "La cantidad debe ser mayor a 0" });
      }
      targetCantidad = body.cantidadSolicitada;
      updates.push(`cantidad_solicitada = $${updates.length + 1}`);
      params.push(body.cantidadSolicitada);
    }

    if (body.fechaEsperada !== undefined) {
      const value = normalizeDateInput(body.fechaEsperada) ?? null;
      updates.push(`fecha_esperada = $${updates.length + 1}`);
      params.push(value);
    }

    let fechaRecibidoValue: string | null | undefined = body.fechaRecibido;

    const normalizeEstado = (estado?: string | null) => (estado ?? "").toLowerCase();

    if (body.estado) {
      const validStates = await fetchActivePedidoStates();
      if (!validStates.includes(body.estado)) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "Estado no válido" });
      }
      targetEstado = body.estado;
      updates.push(`estado = $${updates.length + 1}`);
      params.push(body.estado);

      if (normalizeEstado(body.estado) === "recibido" && fechaRecibidoValue === undefined) {
        fechaRecibidoValue = new Date().toISOString().slice(0, 10);
      } else if (normalizeEstado(body.estado) !== "recibido" && fechaRecibidoValue === undefined) {
        fechaRecibidoValue = null;
      }
    }

    if (fechaRecibidoValue !== undefined) {
      const value = normalizeDateInput(fechaRecibidoValue) ?? null;
      updates.push(`fecha_recibido = $${updates.length + 1}`);
      params.push(value);
    }

    if (!updates.length) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);

    await client.query(`UPDATE pedidos_suplidores SET ${updates.join(", ")} WHERE id_pedido = $${params.length}`, params);

    const wasRecibido = normalizeEstado(current.estado) === "recibido";
    const isRecibido = normalizeEstado(targetEstado) === "recibido";
    const needsStockApplication = !current.id_producto && isRecibido;
    const movimientoRecibidoExiste = isRecibido
      ? (
          await client.query<{ existe: number }>(
            `SELECT 1 AS existe FROM movimientos_inv WHERE observacion = $1 LIMIT 1`,
            [`Pedido ${id} recibido`]
          )
        ).rowCount > 0
      : false;
    const shouldApplyStock = needsStockApplication || (!wasRecibido && isRecibido) || (isRecibido && !movimientoRecibidoExiste);
    const shouldRevertStock = wasRecibido && !isRecibido;

    let productIdForUpdate = current.id_producto;

    if (!productIdForUpdate && isRecibido) {
      if (!current.id_tipo_producto || !current.id_marca || !current.id_modelo) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "No se pudo determinar el producto para este pedido" });
      }

      let baseName = current.nombre_producto ?? null;
      if (!baseName) {
        const { rows: descriptorRows } = await client.query(
          `SELECT mo.nombre AS modelo_nombre, ma.nombre AS marca_nombre
           FROM modelos mo
           LEFT JOIN marcas ma ON ma.id_marca = mo.id_marca
           WHERE mo.id_modelo = $1`,
          [current.id_modelo]
        );
        if (descriptorRows.length) {
          const { modelo_nombre, marca_nombre } = descriptorRows[0];
          const combined = `${marca_nombre ?? ""} ${modelo_nombre ?? ""}`.trim();
          baseName = combined || "Producto pendiente";
        } else {
          baseName = "Producto pendiente";
        }
      }

      const initialStockMaximo = Math.max(typeof targetCantidad === "number" ? targetCantidad : 0, 1);
      const {
        rows: newProductRows
      } = await client.query(
        `INSERT INTO productos (
           nombre,
           descripcion,
           id_tipo_producto,
           id_marca,
           id_modelo,
           precio_tienda,
           precio_ruta,
           stock_actual,
           stock_no_disponible,
           stock_minimo,
           stock_maximo,
           semanas_max_sin_movimiento,
           id_suplidor,
           disponible
         )
         VALUES ($1, NULL, $2, $3, $4, 0, 0, 0, 0, 0, $5, 0, $6, TRUE)
         RETURNING id_producto`,
        [baseName, current.id_tipo_producto, current.id_marca, current.id_modelo, initialStockMaximo, current.id_suplidor]
      );

      productIdForUpdate = newProductRows[0].id_producto;

      await client.query(`UPDATE pedidos_suplidores SET id_producto = $1 WHERE id_pedido = $2`, [
        productIdForUpdate,
        id
      ]);
    }

    if (wasRecibido && body.cantidadSolicitada !== undefined && isRecibido) {
      await client.query("ROLLBACK");
      client.release();
      return res
        .status(400)
        .json({ message: "Cambia el estado del pedido antes de modificar la cantidad recibida." });
    }

    if (shouldApplyStock || shouldRevertStock) {
      if (!productIdForUpdate) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "Producto asociado no encontrado" });
      }
      const productResult = await client.query<{ stock_actual: number; stock_maximo: number }>(
        `SELECT stock_actual, stock_maximo FROM productos WHERE id_producto = $1 FOR UPDATE`,
        [productIdForUpdate]
      );
      if (!productResult.rowCount) {
        await client.query("ROLLBACK");
        client.release();
        return res.status(400).json({ message: "Producto asociado no encontrado" });
      }
      const stockActual = Number(productResult.rows[0].stock_actual);
      const stockMaximoActual = Number(productResult.rows[0].stock_maximo);
      let nuevoStock = stockActual;
      let movimientoCantidad = 0;
      let movimientoTipo = "ajuste";
      let mensaje = `Pedido ${id}`;

      if (shouldApplyStock) {
        nuevoStock = stockActual + targetCantidad;
        movimientoCantidad = targetCantidad;
        movimientoTipo = "entrada";
        mensaje = `Pedido ${id} recibido`;

        if (!Number.isNaN(stockMaximoActual) && stockMaximoActual > 0 && nuevoStock > stockMaximoActual) {
          await client.query("ROLLBACK");
          client.release();
          return res
            .status(400)
            .json({ message: "El stock máximo del producto sería superado. Ajusta el límite antes de recibir el pedido." });
        }
      } else {
        nuevoStock = stockActual - current.cantidad_solicitada;
        if (nuevoStock < 0) {
          await client.query("ROLLBACK");
          client.release();
          return res.status(400).json({ message: "No hay stock disponible para revertir este pedido." });
        }
        movimientoCantidad = current.cantidad_solicitada;
        mensaje = `Pedido ${id} revertido`;
      }

      await client.query(`UPDATE productos SET stock_actual = $1, ultima_fecha_movimiento = NOW() WHERE id_producto = $2`, [
        nuevoStock,
        productIdForUpdate
      ]);

      await client.query(
        `INSERT INTO movimientos_inv (
           id_producto,
           tipo_movimiento,
           cantidad,
           stock_anterior,
           stock_nuevo,
           id_usuario,
           observacion,
           id_salida,
           id_detalle_salida
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL)`,
        [productIdForUpdate, movimientoTipo, movimientoCantidad, stockActual, nuevoStock, tokenUser.id, mensaje]
      );
    }

    await client.query("COMMIT");
    client.release();

    const pedido = await fetchPedidoById(id);
    return res.json(pedido);
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error actualizando pedido", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default pedidosRouter;
