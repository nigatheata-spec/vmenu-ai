// =============================================================
// Vmenu.ai — API Client
// Thin, typed fetch wrappers. No library dependency — works in
// both the browser and Next.js server components.
// =============================================================

import type { MenuItemDTO, CategoryDTO, ApiEnvelope, ApiError } from "@/types/api";

// -------------------------------------------------------------
// Configuration
// Set NEXT_PUBLIC_API_BASE in .env.local:
//   NEXT_PUBLIC_API_BASE=https://api.vmenu.ai
// Fallback to same-origin so relative paths work in dev.
// -------------------------------------------------------------
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "";

// -------------------------------------------------------------
// Custom error class — carries the structured backend payload
// -------------------------------------------------------------
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: ApiError,
  ) {
    super(payload.message);
    this.name = "ApiClientError";
  }
}

// -------------------------------------------------------------
// Core fetch helper
// -------------------------------------------------------------
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      // Supabase auth uses httpOnly cookies managed by @supabase/ssr.
      // The session cookie is sent automatically by the browser on every
      // same-origin request — no manual Authorization header needed.
      // The Route Handlers read it via createSupabaseServerClient().
    },
    // credentials: "include" is the default for same-origin requests,
    // which means cookies are always sent. No extra config needed.
    ...options,
  });

  if (!res.ok) {
    let payload: ApiError;
    try {
      payload = await res.json();
    } catch {
      payload = { code: "UNKNOWN", message: res.statusText };
    }
    throw new ApiClientError(res.status, payload);
  }

  // Support both naked arrays / objects AND the envelope shape
  const body = await res.json();
  // If the backend wraps in { data: ... }, unwrap it
  return ("data" in body ? (body as ApiEnvelope<T>).data : body) as T;
}

// -------------------------------------------------------------
// Menu endpoints
// -------------------------------------------------------------

/** GET /api/menu/items — fetch all menu items */
export async function fetchMenuItems(): Promise<MenuItemDTO[]> {
  return apiFetch<MenuItemDTO[]>("/api/menu/items");
}

/** GET /api/menu/categories — fetch all categories */
export async function fetchCategories(): Promise<CategoryDTO[]> {
  return apiFetch<CategoryDTO[]>("/api/menu/categories");
}

/** GET /api/menu/items?category_id=:id — items filtered by category */
export async function fetchMenuItemsByCategory(
  categoryId: string,
): Promise<MenuItemDTO[]> {
  return apiFetch<MenuItemDTO[]>(
    `/api/menu/items?category_id=${encodeURIComponent(categoryId)}`,
  );
}

/** POST /api/menu/items — create a new item */
export async function createMenuItem(
  body: Omit<MenuItemDTO, "id">,
): Promise<MenuItemDTO> {
  return apiFetch<MenuItemDTO>("/api/menu/items", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PUT /api/menu/items/:id — update an existing item */
export async function updateMenuItem(
  id: string,
  body: Partial<MenuItemDTO>,
): Promise<MenuItemDTO> {
  return apiFetch<MenuItemDTO>(`/api/menu/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** DELETE /api/menu/items/:id */
export async function deleteMenuItem(id: string): Promise<void> {
  return apiFetch<void>(`/api/menu/items/${id}`, { method: "DELETE" });
}

/** POST /api/menu/categories — create a new category */
export async function createCategory(
  body: Omit<CategoryDTO, "id">,
): Promise<CategoryDTO> {
  return apiFetch<CategoryDTO>("/api/menu/categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** PUT /api/menu/categories/:id */
export async function updateCategory(
  id: string,
  body: Partial<CategoryDTO>,
): Promise<CategoryDTO> {
  return apiFetch<CategoryDTO>(`/api/menu/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** DELETE /api/menu/categories/:id */
export async function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/api/menu/categories/${id}`, { method: "DELETE" });
}
