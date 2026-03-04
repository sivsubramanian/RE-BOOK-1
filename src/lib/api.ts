/**
 * Frontend API Service – Central fetch wrapper for the Express backend
 * 
 * Handles JWT token attachment, error parsing, and base URL configuration.
 * All API modules (books, transactions, favorites, notifications) use this.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/** Get the stored JWT token */
export function getToken(): string | null {
  return localStorage.getItem("rebook_token");
}

/** Store a JWT token */
export function setToken(token: string): void {
  localStorage.setItem("rebook_token", token);
}

/** Remove the stored token (logout) */
export function clearToken(): void {
  localStorage.removeItem("rebook_token");
}

/** Standard error class for API responses */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  /** Skip attaching the Authorization header */
  noAuth?: boolean;
}

/**
 * Core fetch wrapper with auth header and error handling
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { noAuth, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  // Attach JWT unless noAuth or FormData (multipart)
  if (!noAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Only set Content-Type for non-FormData bodies
  if (rest.body && !(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...rest,
    headers,
  });

  // Handle non-JSON responses (like 204 No Content)
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      data.error || data.message || `Request failed (${res.status})`,
      res.status
    );
  }

  return data as T;
}
