import type { Frecuencia, Moneda, ClienteEstatus } from "@/types";

export const APP_NAME = "GestorCobros";

// Claves de almacenamiento local
export const TOKEN_KEY = "gc_token";
export const USER_KEY = "gc_user";
export const WORKDATE_KEY = "gc_workdate";
export const MOCK_DB_KEY = "gc_mock_db_v1";

/** Nombre de la cookie que lee proxy.ts para proteger rutas */
export const TOKEN_COOKIE = "gc_token";

export const FRECUENCIAS: Frecuencia[] = [
  "Diaria",
  "Semanal",
  "Quincenal",
  "Mensual",
  "Pago Único",
];

export const MONEDAS: Moneda[] = ["ARP", "USD"];

export const CLIENTE_ESTATUS: ClienteEstatus[] = ["Activo", "Inactivo", "Moroso"];
