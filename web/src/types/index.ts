export type LoginResponse = {
  token: string;
  user: {
    id: string;
    nombre: string;
    apellido?: string | null;
    email: string;
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
  stockNoDisponible?: number;
  stockMinimo: number;
  stockMaximo: number;
  semanasMaxSinMovimiento?: number;
  ultimaFechaMovimiento?: string | null;
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

export type PricingSettings = {
  porcentajeTienda: number;
  porcentajeRuta: number;
  actualizadoEn: string | null;
  actualizadoPor?: string | null;
};

export type ProductPricingOverride = {
  id: string;
  productoId: string;
  producto: string;
  porcentajeTienda: number | null;
  porcentajeRuta: number | null;
  actualizadoEn: string;
  actualizadoPor?: string | null;
  actualizadoPorNombre?: string | null;
};

export type ProductTypePricingOverride = {
  id: string;
  tipoId: string;
  tipo: string;
  porcentajeTienda: number | null;
  porcentajeRuta: number | null;
  actualizadoEn: string;
  actualizadoPor?: string | null;
  actualizadoPorNombre?: string | null;
};

export type Brand = {
  id: string;
  nombre: string;
  descripcion?: string | null;
};

export type Model = {
  id: string;
  brandId: string;
  brandName?: string | null;
  typeId: string;
  typeName?: string | null;
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
  ticket_numero?: number;
  ticketNumero?: number;
  fecha_salida: string;
  fecha_entrega: string | null;
  total: number;
  estado: string;
  tipo_salida: string;
  tipo_venta?: "contado" | "credito";
  tipoVenta?: "contado" | "credito";
  vendedor: string;
  detalles: SalidaDetalle[];
};

export type Pedido = {
  id: string;
  productoId?: string | null;
  producto: string;
  productoNombreReferencia?: string | null;
  tipoId: string;
  tipoNombre?: string | null;
  marcaId?: string | null;
  marcaNombre?: string | null;
  modeloId?: string | null;
  modeloNombre?: string | null;
  suplidorId: string;
  suplidor: string;
  cantidadSolicitada: number;
  precioCosto?: number | null;
  fechaPedido: string;
  fechaEsperada: string | null;
  fechaRecibido: string | null;
  estado: string;
  usuarioId: string;
  solicitadoPor: string | null;
};

export type PedidoStatus = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  posicion?: number;
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
  salidaId?: string | null;
  detalleSalidaId?: string | null;
};

export type MovimientoDetalle = {
  movimiento: Movimiento;
  ticket: Salida | null;
};

export type SalidaStatus = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

export type User = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  activo: boolean;
  fechaCreacion: string;
};

export type Role = {
  id: string;
  nombre: string;
};

export type UserCreationResponse = {
  user: User;
  emailSent: boolean;
};
