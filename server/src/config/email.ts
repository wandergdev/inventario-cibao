import { env } from "./env";

const toBoolean = (value?: string) => value === "true";

export const emailConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: toBoolean(process.env.SMTP_SECURE),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
  appUrl: env.appUrl
};

export const emailEnabled = Boolean(emailConfig.host && emailConfig.user && emailConfig.pass);
