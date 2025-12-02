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
  tipoId?: string | null;
  tipoNombre?: string | null;
  marcaId?: string | null;
  marcaNombre?: string | null;
  modeloId?: string | null;
  modeloNombre?: string | null;
  precioTienda: number;
  precioRuta: number;
  stockActual: number;
  stockMinimo: number;
  disponible: boolean;
  motivoNoDisponible?: string;
  suplidorId?: string | null;
  suplidor?: string | null;
};

export type ProductType = {
  id: string;
  nombre: string;
  descripcion?: string | null;
};

export type Brand = {
  id: string;
  nombre: string;
  descripcion?: string | null;
};

export type Model = {
  id: string;
  brandId: string;
  nombre: string;
  descripcion?: string | null;
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

export type Pedido = {
  id: string;
  productoId: string;
  producto: string;
  suplidorId: string;
  suplidor: string;
  cantidadSolicitada: number;
  fechaPedido: string;
  fechaEsperada: string | null;
  fechaRecibido: string | null;
  estado: string;
  usuarioId: string;
  solicitadoPor: string | null;
};

export type Movimiento = {
  id: string;
  tipoMovimiento: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  fecha: string;
  observacion?: string | null;
  productoId: string;
  producto: string;
  usuarioId: string;
  usuario: string;
};
