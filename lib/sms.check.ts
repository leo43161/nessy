// Chequeo de lib/sms.ts — `node lib/sms.check.ts`
//
// Lo que se comprueba acá es plata: un solo carácter fuera del alfabeto GSM-7
// tira el mensaje entero a 70 caracteres por pieza, y un resumen que entraba
// en uno pasa a costar tres. La palabra "próxima" alcanza para eso.
import assert from "node:assert/strict";
import { aGsm7, enlaceSms, esGsm7, medirSms, resumenParaSms } from "./sms.ts";
import type { EstadoDeCuenta } from "../types/index.ts";

// ── El alfabeto ───────────────────────────────────────────────────────────
assert.equal(esGsm7("Hola que tal"), true);
// Estos SÍ entran y no hay que tocarlos: cambiarlos no ahorra nada.
assert.equal(esGsm7("Perez ñandu ü ö ä à è é ì ò ù Ç ß"), true);
assert.equal(esGsm7("¿Cuanto? ¡Ya!"), true);
// Estos NO entran, y son los que rompen la cuenta.
assert.equal(esGsm7("próxima"), false);
assert.equal(esGsm7("María"), false);
assert.equal(esGsm7("Perú"), false);
assert.equal(esGsm7("índice"), false);
// Los emojis son lo peor: uno solo triplica el costo del mensaje.
assert.equal(esGsm7("Hola 👋"), false);

// ── La transcripción ──────────────────────────────────────────────────────
assert.equal(aGsm7("próxima"), "proxima");
assert.equal(aGsm7("María Pérez"), "Maria Pérez"); // la é se queda: es gratis
assert.equal(aGsm7("Ñandú"), "Ñandu");
assert.equal(aGsm7("Vencimiento — 26/08"), "Vencimiento - 26/08");
assert.equal(aGsm7("«hola»"), '"hola"');
// Y lo transcrito tiene que quedar adentro del alfabeto, siempre.
for (const s of ["próxima", "María", "Perú", "Hola 👋", "Añadió más", "cañón"]) {
  assert.equal(esGsm7(aGsm7(s)), true, `no quedó en GSM-7: ${s} → ${aGsm7(s)}`);
}

// ── La cuenta de piezas ───────────────────────────────────────────────────
assert.deepEqual(medirSms(""), { caracteres: 0, piezas: 0, restantes: 160, alfabeto: "GSM-7" });

const justo160 = "a".repeat(160);
assert.equal(medirSms(justo160).piezas, 1);
assert.equal(medirSms(justo160).restantes, 0);

// Uno más y se parte: y al partirse cada pieza pierde lugar, así que 161
// caracteres entran en 2 piezas de 153.
assert.equal(medirSms("a".repeat(161)).piezas, 2);
assert.equal(medirSms("a".repeat(306)).piezas, 2);
assert.equal(medirSms("a".repeat(307)).piezas, 3);

// El caso caro: el MISMO largo, con una tilde de más.
const sinTilde = "Su proxima cuota vence pronto. " + "a".repeat(100);
const conTilde = "Su próxima cuota vence pronto. " + "a".repeat(100);
assert.equal(medirSms(sinTilde).piezas, 1, "sin tilde tiene que entrar en una");
assert.equal(medirSms(conTilde).alfabeto, "UCS-2");
assert.equal(medirSms(conTilde).piezas, 2, "una sola ó duplica el mensaje");

// Los del set extendido ocupan dos lugares, no uno.
assert.equal(medirSms("[]").caracteres, 4);
assert.equal(medirSms("€").caracteres, 2);

// ── El resumen ────────────────────────────────────────────────────────────
const ec = (extra: Partial<EstadoDeCuenta> = {}): EstadoDeCuenta => ({
  clienteId: 1,
  clienteNombre: "María Rodríguez",
  generadoEl: "2026-08-19",
  totalPagado: 50000,
  saldoPendiente: 110000,
  totalVencido: 0,
  planes: [],
  ...extra,
});

const plan = (fecha: string, monto: number) => ({
  planId: 1,
  nombre: "Plan",
  status: "Activo" as const,
  montoTotal: 100000,
  cuotasTotales: 4,
  cuotasPagadas: 1,
  pagado: 25000,
  pendiente: 75000,
  vencido: 0,
  proximaCuota: { cuotaId: 1, fecha, monto },
  movimientos: [],
});

const simple = resumenParaSms(ec(), "Preferenciale");
assert.ok(simple.includes("Preferenciale"));
assert.ok(simple.includes("$110.000"));
// El nombre viaja transcrito: si no, el mensaje entero costaría el doble.
assert.ok(simple.includes("Maria Rodriguez"), simple);
assert.equal(esGsm7(simple), true, "el resumen SIEMPRE tiene que quedar en GSM-7");
assert.equal(medirSms(simple).piezas, 1, "el caso normal tiene que entrar en un solo mensaje");

// Con vencido y próxima cuota, que es el caso que más ocupa.
const completo = resumenParaSms(
  ec({ totalVencido: 12000, planes: [plan("2026-08-26", 25000), plan("2026-09-02", 25000)] }),
  "Preferenciale",
);
assert.ok(completo.includes("VENCIDO: $12.000"), completo);
// De todas las próximas, la más cercana: al cliente le importa cuándo le toca,
// no de qué plan sale.
assert.ok(completo.includes("26/08"), completo);
assert.ok(!completo.includes("02/09"), "no tiene que listar todas las próximas");
assert.equal(esGsm7(completo), true);
assert.equal(medirSms(completo).piezas, 1, `se fue a ${medirSms(completo).piezas} piezas:\n${completo}`);

// Sin centavos: en un SMS ocupan cuatro lugares y no dicen nada.
assert.ok(!resumenParaSms(ec({ saldoPendiente: 110000.5 }), "X").includes(",50"));

// Un nombre largo no puede tirar el resumen a tres mensajes sin que se note.
const largo = resumenParaSms(
  ec({ clienteNombre: "Supermercado y Distribuidora Los Hermanos Gonzalez S.R.L." }),
  "Preferenciale",
);
assert.equal(esGsm7(largo), true);
assert.ok(medirSms(largo).piezas <= 2, "ni el nombre más largo debería pasar de 2 piezas");

// ── El enlace ─────────────────────────────────────────────────────────────
// Sin navigator (esto corre en node) cae en la rama de Android, que es la del
// estándar.
const enlace = enlaceSms("+54 9 381 123-4567", "Hola");
assert.ok(enlace.startsWith("sms:+5493811234567?body="), enlace);
assert.ok(enlace.includes("Hola"));
// Sin número, abre el redactor vacío para elegir el contacto a mano.
assert.ok(enlaceSms(null, "Hola").startsWith("sms:?body="));
// Los saltos de línea y los signos tienen que viajar codificados o el enlace
// se corta en el primer & que aparezca.
assert.ok(enlaceSms(null, "a\nb").includes("%0A"));
assert.ok(enlaceSms(null, "a&b=c").includes("%26"));

console.log("✓ sms.ts OK");
