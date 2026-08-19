// Chequeo de lib/status.ts —  `npm run check`
//
// Solo cubre tipoDeCobro(), que es la única lógica de plata del archivo: de
// ella depende qué stored procedure termina corriendo (ideal / parcial /
// adelantado) y, en el caso parcial, que se cree una cuota nueva por la
// diferencia. Un error acá no rompe la pantalla: cobra mal.
import assert from "node:assert/strict";
import { esCobrado, esDeuda, esTrabajoDelDia, esVencido, tipoDeCobro } from "./status.ts";

const ESPERADO = 75000;

assert.equal(tipoDeCobro(75000, ESPERADO), "ideal");
assert.equal(tipoDeCobro(50000, ESPERADO), "parcial");
assert.equal(tipoDeCobro(150000, ESPERADO), "adelantado");

// El motivo de comparar en centavos enteros: con una tolerancia sobre floats
// (abs(a-b) < 0.01) un centavo de diferencia caía del lado equivocado por el
// redondeo binario, y un cobro parcial se registraba como cobro exacto.
assert.equal(tipoDeCobro(74999.99, ESPERADO), "parcial", "un centavo de menos ya es parcial");
assert.equal(tipoDeCobro(75000.01, ESPERADO), "adelantado", "un centavo de más ya es adelanto");

// Los decimales tienen que sobrevivir al redondeo: 0.1 + 0.2 !== 0.3 en binario.
assert.equal(tipoDeCobro(0.1 + 0.2, 0.3), "ideal", "el redondeo binario no puede cambiar el tipo");

// La misma comparación que hace la API, sobre montos con centavos reales.
assert.equal(tipoDeCobro(1234.56, 1234.56), "ideal");
assert.equal(tipoDeCobro(1234.55, 1234.56), "parcial");

// N.4: la cuota queda Pagado cobre lo que cobre. No hay estados Adelanto ni
// Recargo, así que "cobrado" es exactamente uno.
assert.equal(esCobrado("Pagado"), true);
assert.equal(esCobrado("Pendiente"), false);

// Vencido se deriva, no se guarda.
assert.equal(esVencido("Pendiente", "2026-07-01", "2026-08-05"), true);
assert.equal(esVencido("Pendiente", "2026-09-01", "2026-08-05"), false);
assert.equal(esVencido("Pagado", "2026-07-01", "2026-08-05"), false, "una pagada nunca vence");

// "Atrasado" y "Vencido" no son lo mismo, y esa diferencia es el punto.
//
// Vencido lo dice el calendario y no requiere que nadie haga nada. Atrasado lo
// escribe el cobrador cuando fue y no pudo cobrar. Una atrasada NO se muestra
// además como vencida: las dos son ciertas, pero atrasado dice más.
assert.equal(
  esVencido("Atrasado", "2026-07-01", "2026-08-05"),
  false,
  "una atrasada ya tiene su propio chip: no se muestra encima como vencida",
);

// Pero las dos son deuda: lo que no se cobró y ya venció, por la razón que sea.
assert.equal(esDeuda("Atrasado", "2026-07-01", "2026-08-05"), true);
assert.equal(esDeuda("Pendiente", "2026-07-01", "2026-08-05"), true, "vencida sin visitar");
assert.equal(esDeuda("Pendiente", "2026-09-01", "2026-08-05"), false, "todavía no vence");
assert.equal(esDeuda("Pagado", "2026-07-01", "2026-08-05"), false);

// Una atrasada tampoco cuenta como cobrada, por más gestión que haya habido.
assert.equal(esCobrado("Atrasado"), false);

// ── Qué entra en la lista del día ────────────────────────────────────────
//
// El caso reportado: plan semanal de 5 cuotas arrancando el 19/08. Parado en
// el 19 tienen que verse SOLO las del 19; parado en el 26, la del 26 más lo
// que quedó debiendo del 19.
const DIA = "2026-08-19";

assert.equal(esTrabajoDelDia("Pendiente", "2026-08-19", DIA), true, "la del día va");
assert.equal(esTrabajoDelDia("Pagado", "2026-08-19", DIA), true, "la del día ya cobrada también");
assert.equal(esTrabajoDelDia("Pendiente", "2026-08-26", DIA), false, "la que todavía no vence, no");

// El día siguiente: la que se cobró el 19 desaparece, la que no se cobró queda.
assert.equal(
  esTrabajoDelDia("Pagado", "2026-08-19", "2026-08-20"),
  false,
  "una cobrada no vuelve a aparecer al día siguiente",
);
assert.equal(
  esTrabajoDelDia("Pendiente", "2026-08-19", "2026-08-20"),
  true,
  "una sin cobrar sigue estando: es lo que hay que ir a buscar",
);
assert.equal(
  esTrabajoDelDia("Atrasado", "2026-08-19", "2026-08-20"),
  true,
  "una visitada sin éxito también sigue siendo deuda",
);

// Y volviendo al 19 con el calendario, la cobrada tiene que volver a verse.
assert.equal(esTrabajoDelDia("Pagado", "2026-08-19", "2026-08-19"), true);

console.log("✓ status.ts OK");
