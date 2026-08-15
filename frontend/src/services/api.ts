import type {
  ApiErrorShape,
  Card,
  SavedComparison,
  SearchResponse,
  User,
} from "../types";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000";

const TOKEN_KEY = "price_compare_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  opts: { signal?: AbortSignal } = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: opts.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
   
  }

  if (!res.ok) {
    const shaped = body as ApiErrorShape | null;
    let message = "Something went wrong. Please try again.";
    if (shaped?.detail) {
      message = Array.isArray(shaped.detail)
        ? shaped.detail.map((d) => `${d.field}: ${d.message}`).join(", ")
        : shaped.detail;
    }
  
    const isAuthEntryPoint = path === "/auth/login" || path === "/auth/register";
    if (res.status === 401 && !isAuthEntryPoint) {
      window.dispatchEvent(new Event("price-compare:unauthorized"));
    }
    throw new ApiError(message, res.status);
  }

  return body as T;
}



export function register(email: string, password: string) {
  return request<{ access_token: string; user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<{ access_token: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ detail: string }>("/auth/logout", { method: "POST" }).catch(() => undefined);
}

export function fetchMe() {
  return request<User>("/auth/me");
}



export function searchDeals(query: string, signal?: AbortSignal) {
  return request<SearchResponse>(`/search?q=${encodeURIComponent(query)}`, {}, { signal });
}



export function saveComparison(payload: {
  query: string;
  deals: SearchResponse["deals"];
  cheapest_deal: SearchResponse["cheapest"];
  best_way_to_pay: SearchResponse["best_way_to_pay"];
}) {
  return request<SavedComparison>("/comparisons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listComparisons() {
  return request<SavedComparison[]>("/comparisons");
}

export function getComparison(id: string) {
  return request<SavedComparison>(`/comparisons/${id}`);
}

export function deleteComparison(id: string) {
  return request<void>(`/comparisons/${id}`, { method: "DELETE" });
}



export function listCards() {
  return request<Card[]>("/cards");
}
