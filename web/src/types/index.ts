export type LoginResponse = {
  token: string;
  user: {
    id: string;
    nombre: string;
    rol: string;
  };
};

export type Supplier = {
  id: string;
  nombreEmpresa: string;
  direccion?: string;
  telefono?: string;
  contactoVendedor?: string;
  diasCredito?: number;
  activo: boolean;
  fechaRegistro?: string;
};

export type Product = {
  id: string;
  nombre: string;
  descripcion?: string;
  stockActual: number;
  stockMinimo: number;
  disponible: boolean;
  motivoNoDisponible?: string;
  suplidor?: string;
};

export type ApiError = {
  message?: string;
};

export type SalidaDetalle = {
  producto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type Salida = {
  id: string;
  ticket: string;
  fecha_salida: string;
  fecha_entrega: string | null;
  total: number;
  estado: string;
  tipo_salida: string;
  vendedor: string;
  detalles: SalidaDetalle[];
};
