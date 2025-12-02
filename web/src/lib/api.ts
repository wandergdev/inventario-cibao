import {
  ApiError,
  LoginResponse,
  Movimiento,
  Pedido,
  Product,
  ProductType,
  Supplier,
  Salida,
  Brand,
  Model
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const jsonHeaders = { "Content-Type": "application/json" } as const;

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.message ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ email, password })
  });
}

export async function fetchSuppliers(token: string) {
  return apiFetch<Supplier[]>("/suppliers", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createSupplier(token: string, payload: Partial<Supplier>) {
  return apiFetch<Supplier>("/suppliers", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateSupplier(token: string, id: string, payload: Partial<Supplier>) {
  return apiFetch<Supplier>(`/suppliers/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchProducts(token: string) {
  return apiFetch<Product[]>("/products", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function fetchProductTypes(token: string) {
  return apiFetch<ProductType[]>("/product-types", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function fetchBrands(token: string) {
  return apiFetch<Brand[]>("/brands", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function fetchModels(token: string, brandId?: string) {
  const params = brandId ? `?brandId=${brandId}` : "";
  return apiFetch<Model[]>(`/models${params}`, {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createProduct(
  token: string,
  payload: {
    nombre: string;
    descripcion?: string;
    tipoId: string;
    marcaId: string;
    modeloId?: string;
    modeloNombre?: string;
    precioTienda: number;
    precioRuta: number;
    stockActual: number;
    stockMinimo: number;
    suplidorId?: string;
    disponible: boolean;
    motivoNoDisponible?: string;
  }
) {
  return apiFetch<Product>("/products", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchSalidas(token: string) {
  return apiFetch<Salida[]>("/salidas", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createSalida(
  token: string,
  payload: { tipoSalida?: "tienda" | "ruta"; productos: Array<{ productId: string; cantidad: number; precioUnitario?: number }>; fechaEntrega?: string }
) {
  return apiFetch<Salida>("/salidas", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchPedidos(token: string) {
  return apiFetch<Pedido[]>("/pedidos", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createPedido(
  token: string,
  payload: { productId: string; supplierId: string; cantidadSolicitada: number; fechaEsperada?: string }
) {
  return apiFetch<Pedido>("/pedidos", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updatePedido(
  token: string,
  id: string,
  payload: { estado?: "pendiente" | "recibido" | "cancelado"; cantidadSolicitada?: number; fechaEsperada?: string | null; fechaRecibido?: string | null }
) {
  return apiFetch<Pedido>(`/pedidos/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchMovimientos(
  token: string,
  filters?: { tipo?: string; productId?: string; userId?: string; from?: string; to?: string }
) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });
  }
  const query = params.size ? `?${params.toString()}` : "";
  return apiFetch<Movimiento[]>(`/movimientos${query}`, {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}
