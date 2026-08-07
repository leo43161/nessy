import { api } from "@/services/api";
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

export async function login(payload: LoginPayload): Promise<LoginResponse> {
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

/**
 * ¿La sesión sigue viva? Lo decide la API, no el front.
 *
 * No recibe el token: lo pone el interceptor desde localStorage. Pasarlo por
 * parámetro sugería que viajaba en el body, y no es así.
 */
export async function validateToken(): Promise<boolean> {
  try {
    // No existe /auth/validate: la sesión se comprueba pidiendo /auth/yo, que
    // el middleware ya protege con el token del header.
    await api.get("/auth/yo");
    return true;
  } catch {
    return false;
  }
}
