import swaggerJsdoc from "swagger-jsdoc";
import type { Options } from "swagger-jsdoc";
import path from "path";

const routesTsPath = path.resolve(__dirname, "../routes/*.ts");
const routesJsPath = path.resolve(__dirname, "../routes/*.js");

const options: Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Inventario Cibao API",
      version: "0.1.0",
      description: "Documentación inicial del backend (autenticación, inventario, reportes)."
    },
    servers: [{ url: "http://localhost:4000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nombre: { type: "string" },
            apellido: { type: "string" },
            email: { type: "string", format: "email" },
            rol: { type: "string" },
            activo: { type: "boolean" },
            fechaCreacion: { type: "string", format: "date-time" }
          }
        },
        UserCreateInput: {
          type: "object",
          required: ["nombre", "apellido", "email", "password", "roleName"],
          properties: {
            nombre: { type: "string" },
            apellido: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
            roleName: { type: "string" }
          }
        },
        UserUpdateInput: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            apellido: { type: "string" },
            password: { type: "string", format: "password" },
            roleName: { type: "string" },
            activo: { type: "boolean" }
          }
        },
        Supplier: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nombreEmpresa: { type: "string" },
            direccion: { type: "string" },
            telefono: { type: "string" },
            contactoVendedor: { type: "string" },
            diasCredito: { type: "integer" },
            activo: { type: "boolean" },
            fechaRegistro: { type: "string", format: "date-time" }
          }
        },
        SupplierInput: {
          type: "object",
          properties: {
            nombreEmpresa: { type: "string" },
            direccion: { type: "string" },
            telefono: { type: "string" },
            contactoVendedor: { type: "string" },
            diasCredito: { type: "integer" },
            activo: { type: "boolean" }
          }
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            nombre: { type: "string" },
            descripcion: { type: "string" },
            precioTienda: { type: "number", format: "float" },
            precioRuta: { type: "number", format: "float" },
            stockActual: { type: "integer" },
            stockMinimo: { type: "integer" },
            disponible: { type: "boolean" },
            motivoNoDisponible: { type: "string" },
            suplidorId: { type: "string", format: "uuid" },
            suplidor: { type: "string" }
          }
        },
        ProductCreateInput: {
          type: "object",
          required: ["nombre", "precioTienda", "precioRuta"],
          properties: {
            nombre: { type: "string" },
            descripcion: { type: "string" },
            precioTienda: { type: "number", format: "float" },
            precioRuta: { type: "number", format: "float" },
            stockActual: { type: "integer" },
            stockMinimo: { type: "integer" },
            suplidorId: { type: "string", format: "uuid" },
            disponible: { type: "boolean" },
            motivoNoDisponible: { type: "string" }
          }
        },
        ProductUpdateInput: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            descripcion: { type: "string" },
            precioTienda: { type: "number", format: "float" },
            precioRuta: { type: "number", format: "float" },
            stockActual: { type: "integer" },
            stockMinimo: { type: "integer" },
            suplidorId: { type: "string", format: "uuid" },
            disponible: { type: "boolean" },
            motivoNoDisponible: { type: "string" }
          }
        },
        SalidaDetalle: {
          type: "object",
          properties: {
            producto: { type: "string" },
            cantidad: { type: "integer" },
            precioUnitario: { type: "number", format: "float" },
            subtotal: { type: "number", format: "float" }
          }
        },
        Salida: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            ticket: { type: "string" },
            fecha_salida: { type: "string", format: "date-time" },
            fecha_entrega: { type: "string", format: "date-time" },
            total: { type: "number", format: "float" },
            estado: { type: "string" },
            tipo_salida: { type: "string" },
            vendedor: { type: "string" },
            detalles: {
              type: "array",
              items: { $ref: "#/components/schemas/SalidaDetalle" }
            }
          }
        },
        SalidaCreateInput: {
          type: "object",
          required: ["productos"],
          properties: {
            tipoSalida: {
              type: "string",
              enum: ["tienda", "ruta"],
              default: "tienda"
            },
            fechaEntrega: { type: "string", format: "date" },
            estado: {
              type: "string",
              enum: ["pendiente", "entregada", "cancelada"]
            },
            productos: {
              type: "array",
              items: {
                type: "object",
                required: ["productId", "cantidad"],
                properties: {
                  productId: { type: "string", format: "uuid" },
                  cantidad: { type: "integer" },
                  precioUnitario: { type: "number", format: "float" }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: [routesTsPath, routesJsPath]
};

export const swaggerSpec = swaggerJsdoc(options);
