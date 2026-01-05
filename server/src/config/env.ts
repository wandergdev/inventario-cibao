import { config as loadEnv } from "dotenv";

loadEnv();

const requiredVars = ["DATABASE_URL", "JWT_SECRET"] as const;

type RequiredVar = (typeof requiredVars)[number];

const ensureEnv = (key: RequiredVar) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable de entorno faltante: ${key}`);
  }
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: ensureEnv("DATABASE_URL"),
  jwtSecret: ensureEnv("JWT_SECRET"),
  appUrl: process.env.APP_PORTAL_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000"
};
