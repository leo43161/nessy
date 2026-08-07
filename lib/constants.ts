export const APP_NAME = "GestorCobros";

// Claves de almacenamiento local. No se pisan entre sí ni con las del panel
// admin, que usa el prefijo `na_`.
export const TOKEN_KEY = "gc_token";
export const USER_KEY = "gc_user";
export const WORKDATE_KEY = "gc_workdate";

/**
 * Ventana del worklist: cuántos días hacia atrás y hacia adelante de la fecha
 * de trabajo se le muestran al cobrador.
 *
 * Hacia atrás más que hacia adelante a propósito: lo vencido es lo que hay que
 * ir a buscar, y lo que todavía no venció puede esperar.
 */
export const VENTANA_PASADO = 10;
export const VENTANA_FUTURO = 8;
