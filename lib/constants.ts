// Claves de almacenamiento local. No se pisan entre sí ni con las del panel
// admin, que usa el prefijo `na_`.
export const TOKEN_KEY = "gc_token";
export const USER_KEY = "gc_user";
export const WORKDATE_KEY = "gc_workdate";

/**
 * Cuántos días hacia atrás de la fecha de trabajo se traen cuotas.
 *
 * Solo hacia atrás: la lista del día es **el día elegido más lo que quedó
 * debiendo de antes**. Nada del futuro.
 *
 * Antes eran 10 días para atrás y 8 para adelante, sin filtrar después: un
 * plan semanal mostraba la cuota de la semana que viene junto con la de hoy
 * (el 19 aparecían el 19 y el 26; parado en el 26 aparecían tres). Una cuota
 * que todavía no venció no es trabajo de hoy.
 *
 * 60 días y no 10 para que una deuda vieja siga a la vista: es la que hay que
 * ir a buscar. Lo ya cobrado de días anteriores se filtra aparte, en
 * `getCobrosDia`.
 */
export const VENTANA_PASADO = 60;
