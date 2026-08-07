import { TOKEN_KEY, USER_KEY } from "@/lib/constants";
import type { Cobrador, Cuenta, LoginResponse } from "@/types";

// El token vive en localStorage: de ahí lo lee el interceptor de axios para
// mandarlo en el header Authorization. La cuenta y el cobrador se guardan
// juntos para poder restaurar la sesión al recargar.
//
// Antes también se escribía en una cookie, que leía proxy.ts para cortar el
// acceso del lado del servidor. Con output:"export" no hay servidor, el guard
// pasó al cliente y esa cookie quedó sin nadie que la lea.

interface StoredSession {
  cuenta: Cuenta;
  cobrador: Cobrador;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function persistSession(res: LoginResponse): void {
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify({ cuenta: res.cuenta, cobrador: res.cobrador }));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
