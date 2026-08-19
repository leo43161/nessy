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
 * **Un año, porque la deuda no caduca.** Estaba en 60 días y una cuota impaga
 * de hace 75 desaparecía de la lista: justo la más vieja, que es la que hay
 * que ir a buscar. El cobrador salía a la calle sin saber que existía.
 *
 * No cuesta nada traerla: `getHistorico()` —el que alimenta las estadísticas
 * de esta misma pantalla— ya pide de 2000 a 2099 en cada carga. Recortar el
 * worklist a dos meses no ahorraba un request, solo escondía deuda.
 *
 * Lo ya cobrado de días anteriores no se acumula: lo filtra `esTrabajoDelDia`.
 * Lo único que se arrastra es lo que no se cobró.
 */
export const VENTANA_PASADO = 365;
