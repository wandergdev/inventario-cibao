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
  Model,
  SalidaStatus,
  User,
  Role,
  UserCreationResponse
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const jsonHeaders = { "Content-Type": "application/json" } as const;

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
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

export async function createProductType(token: string, payload: { nombre: string; descripcion?: string }) {
  return apiFetch<ProductType>("/product-types", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateProductType(
  token: string,
  id: string,
  payload: { nombre?: string; descripcion?: string | null }
) {
  return apiFetch<ProductType>(`/product-types/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteProductType(token: string, id: string) {
  return apiFetch<void>(`/product-types/${id}`, {
    method: "DELETE",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function fetchBrands(token: string) {
  return apiFetch<Brand[]>("/brands", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createBrand(token: string, payload: { nombre: string; descripcion?: string }) {
  return apiFetch<Brand>("/brands", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateBrand(token: string, id: string, payload: { nombre?: string; descripcion?: string | null }) {
  return apiFetch<Brand>(`/brands/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteBrand(token: string, id: string) {
  return apiFetch<void>(`/brands/${id}`, {
    method: "DELETE",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function fetchModels(token: string, filters?: { brandId?: string; typeId?: string }) {
  const params = new URLSearchParams();
  if (filters?.brandId) {
    params.append("brandId", filters.brandId);
  }
  if (filters?.typeId) {
    params.append("typeId", filters.typeId);
  }
  const query = params.size ? `?${params.toString()}` : "";
  return apiFetch<Model[]>(`/models${query}`, {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createModel(
  token: string,
  payload: { brandId: string; typeId: string; nombre: string; descripcion?: string | null }
) {
  return apiFetch<Model>("/models", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateModel(
  token: string,
  id: string,
  payload: { brandId?: string; typeId?: string; nombre?: string; descripcion?: string | null }
) {
  return apiFetch<Model>(`/models/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteModel(token: string, id: string) {
  return apiFetch<void>(`/models/${id}`, {
    method: "DELETE",
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
    stockNoDisponible?: number;
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

export async function updateProduct(
  token: string,
  id: string,
  payload: {
    nombre?: string;
    descripcion?: string;
    tipoId?: string;
    marcaId?: string;
    modeloId?: string;
    modeloNombre?: string;
    precioTienda?: number;
    precioRuta?: number;
    stockActual?: number;
    stockNoDisponible?: number;
    stockMinimo?: number;
    suplidorId?: string;
    disponible?: boolean;
    motivoNoDisponible?: string | null;
  }
) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchSalidas(token: string) {
  return apiFetch<Salida[]>("/salidas", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function updateSalida(
  token: string,
  id: string,
  payload: { estado?: string; fechaEntrega?: string | null }
) {
  return apiFetch<void>(`/salidas/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchSalidaStatuses(token: string) {
  return apiFetch<SalidaStatus[]>("/salida-statuses", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createSalidaStatus(
  token: string,
  payload: { nombre: string; descripcion?: string; activo?: boolean }
) {
  return apiFetch<SalidaStatus>("/salida-statuses", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateSalidaStatus(
  token: string,
  id: string,
  payload: { nombre?: string; descripcion?: string | null; activo?: boolean }
) {
  return apiFetch<SalidaStatus>(`/salida-statuses/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchUsers(token: string) {
  return apiFetch<User[]>("/users", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function createUser(
  token: string,
  payload: { nombre: string; apellido: string; email: string; password: string; roleName: string }
) {
  return apiFetch<UserCreationResponse>("/users", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchRoles(token: string) {
  return apiFetch<Role[]>("/roles", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function updateOwnPassword(token: string, payload: { newPassword: string }) {
  return apiFetch<{ message: string }>("/users/me/password", {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function updateUser(
  token: string,
  id: string,
  payload: { nombre?: string; apellido?: string; roleName?: string; activo?: boolean; password?: string }
) {
  return apiFetch<User>(`/users/${id}`, {
    method: "PATCH",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export async function deleteUser(token: string, id: string) {
  return apiFetch<void>(`/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function deleteSalidaStatus(token: string, id: string) {
  return apiFetch<void>(`/salida-statuses/${id}`, {
    method: "DELETE",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createSalida(
  token: string,
  payload: {
    tipoSalida?: "tienda" | "ruta";
    tipoVenta?: "contado" | "credito";
    estado?: string;
    productos: Array<{ productId: string; cantidad: number; precioUnitario?: number }>;
    fechaEntrega?: string;
  }
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

export async function downloadSalidasReport(token: string, start: string, end: string) {
  const url = new URL(`${API_URL}/salidas/report`);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "No se pudo generar el reporte");
  }

  return res.blob();
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
