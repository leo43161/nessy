// Chequeo de lib/status.ts —  `npm run check`
//
// Solo cubre tipoDeCobro(), que es la única lógica de plata del archivo: de
// ella depende qué stored procedure termina corriendo (ideal / parcial /
// adelantado) y, en el caso parcial, que se cree una cuota nueva por la
// diferencia. Un error acá no rompe la pantalla: cobra mal.
import assert from "node:assert/strict";
import { esCobrado, esVencido, tipoDeCobro } from "./status.ts";

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

console.log("✓ status.ts OK");
