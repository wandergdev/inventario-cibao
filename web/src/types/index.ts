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
