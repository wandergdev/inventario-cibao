import { ApiError, LoginResponse, Product, Supplier } from "@/types";

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

export async function fetchProducts(token: string) {
  return apiFetch<Product[]>("/products", {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` }
  });
}

export async function createProduct(
  token: string,
  payload: { nombre: string; stockActual: number; stockMinimo: number; disponible: boolean }
) {
  return apiFetch<Product>("/products", {
    method: "POST",
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, precioTienda: 1, precioRuta: 1 })
  });
}
