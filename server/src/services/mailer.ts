import nodemailer from "nodemailer";
import { emailConfig, emailEnabled } from "../config/email";

const buildTransporter = () => {
  if (!emailEnabled) {
    return null;
  }

  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass
    }
  });
};

const transporter = buildTransporter();

type CredentialsEmailPayload = {
  to: string;
  name: string;
  password: string;
  role: string;
  senderEmail?: string;
};

const buildTemplate = (name: string, role: string, to: string, password: string, appUrl: string) => {
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color:#f5f7fb; padding:24px;">
      <tr>
        <td>
          <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 35px rgba(15,23,42,0.12);">
            <tr>
              <td style="background-color:#0b1540; padding:32px;">
                <p style="margin:0; text-transform:uppercase; letter-spacing:4px; color:#60a5fa; font-size:12px;">Electro Cibao</p>
                <h1 style="margin-top:12px; color:#ffffff; font-size:28px;">Bienvenido a Inventario</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="font-size:16px; color:#0f172a;">Hola <strong>${name}</strong>,</p>
                <p style="font-size:15px; color:#475569; line-height:1.6;">
                  Hemos creado un acceso para ti en la plataforma de inventario de Electro Cibao. Ya puedes ingresar y comenzar a trabajar con tu equipo.
                </p>
                <div style="margin:24px 0; padding:20px; border:1px solid #e2e8f0; border-radius:16px; background-color:#f8fafc;">
                  <p style="margin:0; font-size:14px; color:#0f172a;"><strong>Rol asignado:</strong> ${role}</p>
                  <p style="margin:4px 0 0; font-size:14px; color:#0f172a;"><strong>Usuario:</strong> ${to}</p>
                  <p style="margin:4px 0 0; font-size:14px; color:#0f172a;"><strong>Contraseña temporal:</strong> ${password}</p>
                </div>
                <p style="font-size:15px; color:#475569; line-height:1.6;">
                  Cambia tu contraseña en la sección <strong>Configuración</strong> al ingresar por primera vez.
                </p>
                <p style="text-align:center; margin:32px 0;">
                  <a href="${loginUrl}" style="font-size:16px; font-weight:600; text-decoration:none; background-color:#0ea5e9; color:#ffffff; padding:14px 32px; border-radius:999px; display:inline-block;">
                    Ir al login
                  </a>
                </p>
                <p style="font-size:13px; color:#94a3b8; line-height:1.6; text-align:center;">
                  Si no solicitaste este acceso, responde a este correo para recibir ayuda.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const sendCredentialsEmail = async ({ to, name, password, role, senderEmail }: CredentialsEmailPayload) => {
  const fromAddress = senderEmail || emailConfig.from;
  if (!transporter || !fromAddress) {
    console.info("Correo no configurado, omitiendo notificación de credenciales.");
    return false;
  }

  const appUrl = emailConfig.appUrl;
  const subject = "Bienvenido a Electro Cibao";
  const html = buildTemplate(name, role, to, password, appUrl);

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html
    });
    console.log(`Correo de credenciales enviado a ${to}`);
    return true;
  } catch (error) {
    console.error(`No se pudo enviar el correo de credenciales a ${to}`, error);
    return false;
  }
};

type SaleNotificationPayload = {
  recipients: string[];
  ticket: string;
  total: number;
  estado: string;
  tipoVenta: string;
  vendedor: string;
  fecha: Date | string;
  detalles: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(value);

const buildSaleTemplate = (payload: SaleNotificationPayload) => {
  const formattedDate = new Date(payload.fecha).toLocaleString("es-DO");
  const detailRows = payload.detalles
    .map(
      (detail) => `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0;">${detail.nombre}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">${detail.cantidad}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; text-align:right;">${formatCurrency(detail.precioUnitario)}</td>
          <td style="padding:8px 12px; border-bottom:1px solid #e2e8f0; text-align:right;">${formatCurrency(detail.subtotal)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color:#f5f7fb; padding:24px;">
      <tr>
        <td>
          <table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 12px 35px rgba(15,23,42,0.12);">
            <tr>
              <td style="background-color:#0b1540; padding:32px;">
                <p style="margin:0; text-transform:uppercase; letter-spacing:4px; color:#60a5fa; font-size:12px;">Electro Cibao</p>
                <h1 style="margin-top:12px; color:#ffffff; font-size:24px;">Nueva salida registrada</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; color:#0f172a;">
                <p style="margin:0 0 16px 0; font-size:15px;">Se registró una nueva salida con ticket <strong>${payload.ticket}</strong>.</p>
                <ul style="list-style:none; padding:0; margin:0 0 24px 0; color:#475569; font-size:14px;">
                  <li><strong>Vendedor:</strong> ${payload.vendedor}</li>
                  <li><strong>Fecha:</strong> ${formattedDate}</li>
                  <li><strong>Estado:</strong> ${payload.estado}</li>
                  <li><strong>Tipo de venta:</strong> ${payload.tipoVenta}</li>
                  <li><strong>Total:</strong> ${formatCurrency(payload.total)}</li>
                </ul>
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                  <thead>
                    <tr style="background-color:#f1f5f9; color:#0f172a;">
                      <th style="padding:10px 12px; text-align:left;">Producto</th>
                      <th style="padding:10px 12px; text-align:center;">Cantidad</th>
                      <th style="padding:10px 12px; text-align:right;">Precio unidad</th>
                      <th style="padding:10px 12px; text-align:right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${detailRows}
                  </tbody>
                </table>
                <p style="margin-top:24px; font-size:13px; color:#94a3b8;">Este mensaje se envió automáticamente para mantener al equipo al tanto de las ventas registradas.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const sendSaleNotificationEmail = async (payload: SaleNotificationPayload) => {
  if (!transporter || !payload.recipients.length) {
    return false;
  }

  const [primary, ...rest] = payload.recipients;
  const html = buildSaleTemplate(payload);

  try {
    await transporter.sendMail({
      from: emailConfig.from,
      to: primary,
      bcc: rest.length ? rest : undefined,
      subject: `Nueva salida ${payload.ticket} - ${formatCurrency(payload.total)}`,
      html
    });
    console.log(`Alerta de salida enviada a administradores (${payload.recipients.length})`);
    return true;
  } catch (error) {
    console.error("No se pudo enviar la alerta de salida", error);
    return false;
  }
};
