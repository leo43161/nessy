import { api, USE_MOCK } from "@/services/api";
import { delay, getDb } from "@/services/mock/db";
import { isTokenExpired } from "@/lib/session";
import { aCobrador, type FilaPersona } from "@/services/mapear";
import type { Cobrador, LoginPayload, LoginResponse } from "@/types";

/** Lo que la API mete en `data` del JWT y devuelve en /auth/login y /auth/yo */
interface DatosToken {
  user_id: number;
  usuario: string;
  rol_id: number;
  rol: string;
  id_Cobrador: number | null;
}

/** JWT de utilería para el mock (la API real firma el suyo) */
function buildMockJwt(sub: number, name: string): string {
  const b64 = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, "");
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({ sub, name, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 });
  return `${header}.${payload}.mock-signature`;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (USE_MOCK) {
    const db = getDb();
    const cuentaRow = db.cuentas.find(
      (c) => c.nombreDeUsuario.toLowerCase() === payload.usuario.trim().toLowerCase()
    );
    const cobrador = cuentaRow
      ? db.cobradores.find((c) => c.id === cuentaRow.idCobrador)
      : undefined;
    if (!cuentaRow || !cobrador || !payload.password) {
      await delay(null, 500);
      throw new Error("Usuario o contraseña incorrectos.");
    }
    return delay(
      {
        token: buildMockJwt(cobrador.id, cobrador.nombreCompleto),
        cuenta: { id: cuentaRow.id, nombreDeUsuario: cuentaRow.nombreDeUsuario, rol: cuentaRow.rol },
        cobrador,
      },
      500
    );
  }
  // La API devuelve { token, expira_el, usuario: {...} } con las claves del
  // token, no el { token, cuenta, cobrador } que arma el front.
  const { data } = await api.post<{ token: string; usuario: DatosToken }>("/auth/login", payload);

  // El vínculo cuenta→cobrador vive en Cuenta_Cobrador y la API lo resuelve al
  // emitir el token. Sin ese vínculo el usuario entra pero no tiene cartera:
  // esta app no tiene nada que mostrarle.
  if (data.usuario.id_Cobrador == null) {
    throw new Error("Esta cuenta no está vinculada a ningún cobrador.");
  }

  const cobrador = await getCobrador(data.usuario.id_Cobrador, data.token);

  return {
    token: data.token,
    cuenta: {
      id: data.usuario.user_id,
      nombreDeUsuario: data.usuario.usuario,
      rol: data.usuario.rol,
    },
    cobrador,
  };
}

/**
 * El cobrador como persona (nombre, teléfonos, etc.). El token solo trae su
 * id, así que la ficha se pide aparte.
 *
 * El token va explícito porque este pedido ocurre durante el login, antes de
 * que persistSession() lo guarde: el interceptor todavía no tiene de dónde
 * leerlo.
 */
async function getCobrador(idCobrador: number, token: string): Promise<Cobrador> {
  const { data } = await api.get<{ total: number; cobradores: FilaPersona[] }>("/cobradores", {
    params: { id: idCobrador },
    headers: { Authorization: `Bearer ${token}` },
  });

  const fila = data.cobradores[0];
  if (!fila) {
    throw new Error(`El cobrador ${idCobrador} no existe o está dado de baja.`);
  }
  return aCobrador(fila);
}

/** Valida el token contra la API (mock: chequeo local de expiración) */
export async function validateToken(token: string): Promise<boolean> {
  if (USE_MOCK) {
    return delay(!isTokenExpired(token), 100);
  }
  try {
    // No existe /auth/validate: la sesión se comprueba pidiendo /auth/yo, que
    // el middleware ya protege con el token del header.
    await api.get("/auth/yo");
    return true;
  } catch {
    return false;
  }
}
