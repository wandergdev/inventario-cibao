import express from "express";
import type { Request, Response } from "express";
import { query } from "../db/pool";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

const salidaStatusesRouter = express.Router();

const readRoles = ["Administrador", "Vendedor"];
const adminRoles = ["Administrador"];

const mapStatus = (row: any) => ({
  id: row.id_estado,
  nombre: row.nombre,
  descripcion: row.descripcion,
  activo: row.activo,
  fechaCreacion: row.fecha_creacion
});

salidaStatusesRouter.get("/", requireAuth(readRoles), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`SELECT * FROM salida_estados ORDER BY nombre ASC`);
    res.json(rows.map(mapStatus));
  } catch (error) {
    console.error("Error listando estados de salida", error);
    res.status(500).json({ message: "Error interno" });
  }
});

salidaStatusesRouter.post("/", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nombre, descripcion, activo = true } = req.body ?? {};
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const { rows } = await query(
      `INSERT INTO salida_estados (nombre, descripcion, activo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre.trim(), descripcion?.trim() || null, Boolean(activo)]
    );

    res.status(201).json(mapStatus(rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un estado con ese nombre" });
    }
    console.error("Error creando estado de salida", error);
    res.status(500).json({ message: "Error interno" });
  }
});

salidaStatusesRouter.patch("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { nombre, descripcion, activo } = req.body ?? {};
    const updates: string[] = [];
    const params: Array<any> = [];

    if (nombre !== undefined) {
      if (!nombre.trim()) {
        return res.status(400).json({ message: "El nombre es obligatorio" });
      }
      updates.push(`nombre = $${updates.length + 1}`);
      params.push(nombre.trim());
    }

    if (descripcion !== undefined) {
      updates.push(`descripcion = $${updates.length + 1}`);
      params.push(descripcion?.trim() || null);
    }

    if (activo !== undefined) {
      updates.push(`activo = $${updates.length + 1}`);
      params.push(Boolean(activo));
    }

    if (!updates.length) {
      return res.status(400).json({ message: "No hay datos para actualizar" });
    }

    params.push(id);

    const { rows } = await query(
      `UPDATE salida_estados SET ${updates.join(", ")} WHERE id_estado = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Estado no encontrado" });
    }
    res.json(mapStatus(rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Ya existe un estado con ese nombre" });
    }
    console.error("Error actualizando estado de salida", error);
    res.status(500).json({ message: "Error interno" });
  }
});

salidaStatusesRouter.delete("/:id", requireAuth(adminRoles), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params ?? {};
    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    const { rows } = await query(`SELECT nombre FROM salida_estados WHERE id_estado = $1`, [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "Estado no encontrado" });
    }

    const estadoNombre = rows[0].nombre;
    const { rowCount } = await query(`SELECT 1 FROM salidas_alm WHERE estado = $1 LIMIT 1`, [estadoNombre]);
    if (rowCount) {
      return res.status(400).json({ message: "No puedes eliminar un estado que ya se ha utilizado en una salida" });
    }

    await query(`DELETE FROM salida_estados WHERE id_estado = $1`, [id]);
    res.status(204).send();
  } catch (error) {
    console.error("Error eliminando estado de salida", error);
    res.status(500).json({ message: "Error interno" });
  }
});

export default salidaStatusesRouter;
