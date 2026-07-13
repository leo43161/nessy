import { TOKEN_COOKIE, TOKEN_KEY, USER_KEY } from "@/lib/constants";
import type { Cobrador } from "@/types";

// El token vive en cookie (la lee proxy.ts para proteger rutas)
// y en localStorage (lo lee axios para el header Authorization).

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): Cobrador | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Cobrador) : null;
  } catch {
    return null;
  }
}

export function persistSession(token: string, usuario: Cobrador): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  const maxAge = 60 * 60 * 8; // 8h, igual que la expiración del token
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Decodifica el payload de un JWT sin validar firma (la firma la valida la API) */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as T;
  } catch {
    return null;
  }
}

/** Chequeo local de expiración (el chequeo real lo hace la API en cada request) */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt<{ exp?: number }>(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}
