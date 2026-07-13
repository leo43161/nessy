import { api, USE_MOCK } from "@/services/api";
import { COBRADORES, delay } from "@/services/mock/db";
import { isTokenExpired } from "@/lib/session";
import type { LoginPayload, LoginResponse } from "@/types";

/** JWT de utilería para el mock (la API real firma el suyo) */
function buildMockJwt(sub: number, name: string): string {
  const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, "");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({ sub, name, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 });
  return `${header}.${payload}.mock-signature`;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK) {
    const usuario = COBRADORES.find(
      (c) => c.nombre.toLowerCase() === payload.usuario.trim().toLowerCase()
    );
    if (!usuario || !payload.password) {
      await delay(null, 500);
      throw new Error("Usuario o contraseña incorrectos.");
    }
    return delay({ token: buildMockJwt(usuario.id, usuario.nombre), usuario }, 500);
  }
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

/** Valida el token contra la API (mock: chequeo local de expiración) */
export async function validateToken(token: string): Promise<boolean> {
  if (USE_MOCK) {
    return delay(!isTokenExpired(token), 100);
  }
  try {
    await api.post("/auth/validate", { token });
    return true;
  } catch {
    return false;
  }
}
