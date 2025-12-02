import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import { env } from "./config/env";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";
import usersRouter from "./routes/users";
import suppliersRouter from "./routes/suppliers";
import productsRouter from "./routes/products";
import salidasRouter from "./routes/salidas";
import pedidosRouter from "./routes/pedidos";
import movimientosRouter from "./routes/movimientos";
import productTypesRouter from "./routes/productTypes";
import brandsRouter from "./routes/brands";
import modelsRouter from "./routes/models";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/suppliers", suppliersRouter);
app.use("/products", productsRouter);
app.use("/product-types", productTypesRouter);
app.use("/brands", brandsRouter);
app.use("/models", modelsRouter);
app.use("/salidas", salidasRouter);
app.use("/pedidos", pedidosRouter);
app.use("/movimientos", movimientosRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ message: "Error interno" });
});

app.listen(env.port, () => {
  console.log(`API Inventario Cibao escuchando en el puerto ${env.port}`);
});
