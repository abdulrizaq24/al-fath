import { apiFetch } from "./api";

export interface Supplier {
  id: string;
  pharmacyId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuppliersResponse {
  suppliers: Supplier[];
}

interface SupplierResponse {
  supplier: Supplier;
}

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export async function getSuppliers() {
  const response = await apiFetch<SuppliersResponse>("/suppliers");

  return response.suppliers;
}

export async function getSupplier(id: string) {
  const response = await apiFetch<SupplierResponse>(`/suppliers/${id}`);

  return response.supplier;
}

export async function createSupplier(data: CreateSupplierInput) {
  const response = await apiFetch<SupplierResponse>("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.supplier;
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  const response = await apiFetch<SupplierResponse>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  return response.supplier;
}

export async function updateSupplierStatus(id: string, isActive: boolean) {
  const response = await apiFetch<SupplierResponse>(`/suppliers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      isActive,
    }),
  });

  return response.supplier;
}
