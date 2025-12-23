import express from "express";
import type { Request, Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const productsRouter = express.Router();
const adminRoles = ["Administrador"];
const vendorRoles = ["Vendedor", ...adminRoles];

const listAllowedRoles = Array.from(new Set(vendorRoles));

const baseSelect = `
  SELECT p.id_producto AS id,
         p.nombre,
         p.descripcion,
         p.id_tipo_producto,
         t.nombre AS tipo_nombre,
         p.id_marca,
         m.nombre AS marca_nombre,
         p.id_modelo,
         mo.nombre AS modelo_nombre,
         p.precio_tienda,
         p.precio_ruta,
         p.stock_actual,
         p.stock_no_disponible,
         p.stock_minimo,
         p.disponible,
         p.motivo_no_disponible,
         p.id_suplidor,
         s.nombre_empresa AS suplidor
  FROM productos p
  LEFT JOIN tipos_producto t ON t.id_tipo = p.id_tipo_producto
  LEFT JOIN marcas m ON m.id_marca = p.id_marca
  LEFT JOIN modelos mo ON mo.id_modelo = p.id_modelo
  LEFT JOIN suplidores s ON s.id_suplidor = p.id_suplidor
`;

const mapProduct = (row: any) => ({
  id: row.id,
  nombre: row.nombre,
  descripcion: row.descripcion,
  tipoId: row.id_tipo_producto,
  tipoNombre: row.tipo_nombre,
  marcaId: row.id_marca,
  marcaNombre: row.marca_nombre,
  modeloId: row.id_modelo,
  modeloNombre: row.modelo_nombre,
  precioTienda: row.precio_tienda,
  precioRuta: row.precio_ruta,
  stockActual: row.stock_actual,
  stockNoDisponible: row.stock_no_disponible,
  stockMinimo: row.stock_minimo,
  disponible: row.disponible,
  motivoNoDisponible: row.motivo_no_disponible,
  suplidorId: row.id_suplidor,
  suplidor: row.suplidor
});

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Listar productos
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Product"
 */
productsRouter.get("/", requireAuth(listAllowedRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, supplierId, available } = req.query ?? {};
    const conditions: string[] = [];
    const params: Array<string | boolean> = [];

    if (search) {
      conditions.push(`LOWER(p.nombre) LIKE LOWER($${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (supplierId) {
      conditions.push(`p.id_suplidor = $${params.length + 1}`);
      params.push(supplierId as string);
    }

    if (available !== undefined) {
      conditions.push(`p.disponible = $${params.length + 1}`);
      params.push(available === "true");
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(`${baseSelect} ${whereClause} ORDER BY p.nombre ASC`, params);
    res.json(rows.map(mapProduct));
  } catch (error) {
    console.error("Error listando productos", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Crear producto
 *     tags:
 *       - Productos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ProductCreateInput"
 *     responses:
 *       201:
 *         description: Producto creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Product"
 */
productsRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      nombre,
      descripcion,
      tipoId,
      marcaId,
      modeloId,
      modeloNombre,
      precioTienda,
      precioRuta,
      stockActual = 0,
      stockNoDisponible = 0,
      stockMinimo = 0,
      suplidorId,
      disponible = true,
      motivoNoDisponible
    } = req.body ?? {};

    if (!nombre || !tipoId || !marcaId) {
      return res.status(400).json({ message: "Nombre, tipo y marca son obligatorios" });
    }

    if (!modeloId && !modeloNombre) {
      return res.status(400).json({ message: "Debes seleccionar un modelo o escribir uno nuevo" });
    }

    if (precioTienda === undefined || precioRuta === undefined) {
      return res.status(400).json({ message: "Debes indicar los precios de tienda y ruta" });
    }

    if (stockNoDisponible < 0) {
      return res.status(400).json({ message: "Las unidades inactivas no pueden ser negativas" });
    }

    if (stockNoDisponible > stockActual) {
      return res.status(400).json({ message: "Las unidades inactivas no pueden superar el stock actual" });
    }

    const { rowCount: typeExists } = await query(`SELECT 1 FROM tipos_producto WHERE id_tipo = $1`, [tipoId]);
    if (!typeExists) {
      return res.status(400).json({ message: "Tipo de producto no válido" });
    }

    const { rowCount: brandExists } = await query(`SELECT 1 FROM marcas WHERE id_marca = $1`, [marcaId]);
    if (!brandExists) {
      return res.status(400).json({ message: "Marca no válida" });
    }

    let finalModeloId = modeloId;
    if (!finalModeloId && modeloNombre) {
      const { rows: modeloRows } = await query(
        `INSERT INTO modelos (id_marca, id_tipo_producto, nombre)
         VALUES ($1, $2, $3)
         ON CONFLICT (id_marca, id_tipo_producto, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id_modelo, id_marca, id_tipo_producto`,
        [marcaId, tipoId, modeloNombre.trim()]
      );
      finalModeloId = modeloRows[0].id_modelo;
    }

    if (!finalModeloId) {
      return res.status(400).json({ message: "No se pudo determinar el modelo" });
    }

    const { rows: modeloInfo } = await query(
      `SELECT id_marca, id_tipo_producto FROM modelos WHERE id_modelo = $1`,
      [finalModeloId]
    );

    if (!modeloInfo.length) {
      return res.status(400).json({ message: "Modelo no válido" });
    }

    if (modeloInfo[0].id_marca !== marcaId || modeloInfo[0].id_tipo_producto !== tipoId) {
      return res.status(400).json({ message: "El modelo no coincide con la marca y el tipo seleccionados" });
    }

    if (suplidorId) {
      const { rowCount } = await query(`SELECT 1 FROM suplidores WHERE id_suplidor = $1`, [suplidorId]);
      if (!rowCount) {
        return res.status(400).json({ message: "Suplidor no existe" });
      }
    }

    const cleanReason = typeof motivoNoDisponible === "string" ? motivoNoDisponible.trim() : null;

    const { rows } = await query(
      `INSERT INTO productos (nombre, descripcion, id_tipo_producto, id_marca, id_modelo, precio_tienda, precio_ruta, stock_actual, stock_no_disponible, stock_minimo, id_suplidor, disponible, motivo_no_disponible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        nombre,
        descripcion,
        tipoId,
        marcaId,
        finalModeloId,
        precioTienda,
        precioRuta,
        stockActual,
        stockNoDisponible,
        stockMinimo,
        suplidorId ?? null,
        disponible,
        cleanReason
      ]
    );

    res.status(201).json(mapProduct(rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        message: "Ya existe un producto con la misma combinación de tipo, marca, modelo y precios. Edita el existente."
      });
    }
    console.error("Error creando producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     summary: Actualizar producto
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
 *             $ref: "#/components/schemas/ProductUpdateInput"
 *     responses:
 *       200:
 *         description: Producto actualizado
 */
productsRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const body = req.body ?? {};
    const { rows: currentRows } = await query(`SELECT * FROM productos WHERE id_producto = $1`, [id]);
    if (!currentRows.length) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const current = currentRows[0];
    const updates: string[] = [];
    const params: Array<any> = [];

    const setField = (column: string, value: any) => {
      updates.push(`${column} = $${updates.length + 1}`);
      params.push(value);
    };

    const mapFields: Record<string, string> = {
      nombre: "nombre",
      descripcion: "descripcion",
      precioTienda: "precio_tienda",
      precioRuta: "precio_ruta",
      stockMinimo: "stock_minimo"
    };

    Object.entries(mapFields).forEach(([key, column]) => {
      if (body[key] !== undefined) {
        setField(column, body[key]);
      }
    });

    let targetStockActual = current.stock_actual;
    let targetStockNoDisponible = current.stock_no_disponible ?? 0;
    let targetTipoId = body.tipoId ?? current.id_tipo_producto;
    let targetMarcaId = body.marcaId ?? current.id_marca;
    let finalModeloId = current.id_modelo;
    let modeloChanged = false;

    if (body.stockActual !== undefined) {
      const parsed = Number(body.stockActual);
      if (Number.isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Stock actual no válido" });
      }
      targetStockActual = parsed;
      setField("stock_actual", parsed);
    }

    if (body.stockNoDisponible !== undefined) {
      const parsed = Number(body.stockNoDisponible);
      if (Number.isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Las unidades inactivas no pueden ser negativas" });
      }
      targetStockNoDisponible = parsed;
      setField("stock_no_disponible", parsed);
    }

    if (targetStockNoDisponible > targetStockActual) {
      return res.status(400).json({ message: "Las unidades inactivas no pueden superar el stock actual" });
    }

    if (body.disponible !== undefined) {
      setField("disponible", body.disponible);
    }

    if (body.motivoNoDisponible !== undefined) {
      const clean =
        typeof body.motivoNoDisponible === "string" ? body.motivoNoDisponible.trim() : "";
      setField("motivo_no_disponible", clean ? clean : null);
    }

    if (body.suplidorId !== undefined) {
      if (body.suplidorId) {
        const { rowCount } = await query(`SELECT 1 FROM suplidores WHERE id_suplidor = $1`, [body.suplidorId]);
        if (!rowCount) {
          return res.status(400).json({ message: "Suplidor no existe" });
        }
      }
      setField("id_suplidor", body.suplidorId ?? null);
    }

    if (body.tipoId !== undefined) {
      if (!body.tipoId) {
        return res.status(400).json({ message: "Tipo de producto no válido" });
      }
      const { rowCount } = await query(`SELECT 1 FROM tipos_producto WHERE id_tipo = $1`, [body.tipoId]);
      if (!rowCount) {
        return res.status(400).json({ message: "Tipo de producto no válido" });
      }
      targetTipoId = body.tipoId;
      setField("id_tipo_producto", targetTipoId);
    }

    if (body.marcaId !== undefined) {
      if (!body.marcaId) {
        return res.status(400).json({ message: "Marca no válida" });
      }
      const { rowCount } = await query(`SELECT 1 FROM marcas WHERE id_marca = $1`, [body.marcaId]);
      if (!rowCount) {
        return res.status(400).json({ message: "Marca no válida" });
      }
      targetMarcaId = body.marcaId;
      setField("id_marca", targetMarcaId);
    }

    if (body.modeloId !== undefined || body.modeloNombre) {
      if (body.modeloId !== undefined) {
        finalModeloId = body.modeloId ?? null;
        modeloChanged = true;
      }
      if (!body.modeloId && body.modeloNombre) {
        if (!targetMarcaId || !targetTipoId) {
          return res.status(400).json({ message: "Debes definir tipo y marca antes de crear el modelo" });
        }
        const trimmedName = body.modeloNombre.trim();
        if (!trimmedName) {
          return res.status(400).json({ message: "Nombre de modelo no válido" });
        }
        const { rows: modeloRows } = await query(
          `INSERT INTO modelos (id_marca, id_tipo_producto, nombre)
           VALUES ($1, $2, $3)
           ON CONFLICT (id_marca, id_tipo_producto, nombre) DO UPDATE SET nombre = EXCLUDED.nombre
           RETURNING id_modelo`,
          [targetMarcaId, targetTipoId, trimmedName]
        );
        finalModeloId = modeloRows[0].id_modelo;
        modeloChanged = true;
      }
    }

    if (finalModeloId) {
      const { rows: modeloRows } = await query(
        `SELECT id_marca, id_tipo_producto FROM modelos WHERE id_modelo = $1`,
        [finalModeloId]
      );
      if (!modeloRows.length) {
        return res.status(400).json({ message: "Modelo no válido" });
      }
      if (modeloRows[0].id_marca !== targetMarcaId || modeloRows[0].id_tipo_producto !== targetTipoId) {
        return res.status(400).json({ message: "El modelo no coincide con la marca y el tipo seleccionados" });
      }
    }

    if (modeloChanged) {
      setField("id_modelo", finalModeloId ?? null);
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);

    const { rows } = await query(
      `UPDATE productos SET ${updates.join(", ")} WHERE id_producto = $${params.length} RETURNING *`,
      params
    );

    res.json(mapProduct(rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        message: "Ya existe un producto con la misma combinación de tipo, marca, modelo y precios."
      });
    }
    console.error("Error actualizando producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Eliminar producto
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
 *         description: Producto eliminado
 */
productsRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const result = await query(`DELETE FROM productos WHERE id_producto = $1`, [id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error eliminando producto", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default productsRouter;
