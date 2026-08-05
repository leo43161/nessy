// Chequeo de services/mapear.ts —  `npm run check`
//
// Las filas de abajo son capturas literales de la API en producción
// (https://tucucompras.com.ar/fv1, 2026-08-05), no invenciones. Cubre lo que
// muerde al traducir: los DECIMAL que llegan como string, el estado
// "Atrasado" que el front no tiene, los NULL en campos que el tipo declara
// obligatorios, y el estado de cuenta, que mezcla cuotas con advertencias en
// la misma lista de movimientos.
import assert from "node:assert/strict";
import {
  aBooleanoNullable,
  aCuota,
  aClienteListado,
  aCobrador,
  aEstadoCuota,
  aEstadoDeCuenta,
  aNota,
  aNumero,
  aTelefonos,
  type FilaCliente,
  type FilaCuota,
  type FilaNota,
  type FilaPersona,
  type RespuestaEstadoCuenta,
} from "./mapear.ts";
import type { ClienteListado } from "../types/index.ts";

const HOY = "2026-08-05";

const FILA_CUOTA: FilaCuota = {
  id_Pagos_por_realizar: 101,
  id_Plan_de_pago: 12,
  fecha_acordada: "2026-05-04",
  Monto_esperado: "75000.00",
  Estado: "Pagado",
  Dentro_Rango: null,
  vencida: 0,
  plan_nombre: "Préstamo de Mercadería (May)",
  plan_status: "Completado",
  plan_monto_total: "150000.00",
  id_Clientes: 105,
  cliente_nombre: "Kiosco El Milagro",
  cliente_dni: null,
  cliente_direccion: "Av. Mate de Luna 2500",
  cliente_ubicacion: null,
  id_cobrador_asignado: 5,
  cobradores_asignados: "5",
  cobrador_asignado_nombre: "Juan Pérez",
  id_cobrador_cobro: 5,
  monto_abonado: "75000.00",
  fecha_de_pago: "2026-05-04 10:00:00",
  id_metodo_de_pago: 1,
};

const FILA_CLIENTE: FilaCliente = {
  id_Clientes: 105,
  DNI: null,
  Nombre_completo: "Kiosco El Milagro",
  email: null,
  codigo_postal: null,
  direccion: "Av. Mate de Luna 2500",
  casa_o_dpt_direcc_1: null,
  direccion_laboral_o_alternativa: null,
  casa_o_dpt_direcc_2: null,
  ubicacion_geografica_de_destino_de_cobro: null,
  img: null,
  status: null,
  fecha_de_nacimiento: null,
  id_localidad: 1,
  nombre_localidad: "San Miguel de Tucumán",
  id_Cuenta_Corriente: 88,
  telefonos: ["381-555-1234"],
};

const FILA_COBRADOR: FilaPersona = {
  id_Cobradores: 5,
  DNI: null,
  Nombre_completo: "Juan Pérez",
  email: null,
  codigo_postal: null,
  direccion: null,
  casa_o_dpt_direcc_1: null,
  direccion_laboral_o_alternativa: null,
  casa_o_dpt_direcc_2: null,
  img: null,
  fecha_de_nacimiento: null,
  id_localidad: null,
};

// ── Escalares ───────────────────────────────────────────────────────
assert.equal(aNumero("75000.00"), 75000, "los DECIMAL vienen como string");
assert.equal(aNumero(null), 0, "NULL suma 0, no NaN");
assert.equal(aNumero("basura"), 0, "no puede propagar NaN a los totales");
assert.equal(aNumero("75000.00") + aNumero("75000.00"), 150000, "suma, no concatena");

assert.equal(aBooleanoNullable(1), true);
assert.equal(aBooleanoNullable(0), false);
assert.equal(aBooleanoNullable(null), null, "sin ubicación ≠ fuera de rango");

assert.equal(aEstadoCuota("Pagado"), "Pagado");
assert.equal(
  aEstadoCuota("Atrasado"),
  "Pendiente",
  "Atrasado cae en Pendiente: el front deriva Vencido por fecha y ESTADO[] no tiene esa clave",
);

assert.deepEqual(aTelefonos(["381-555-1234"]), [{ id: 1, numero: "381-555-1234" }]);
assert.deepEqual(aTelefonos(undefined), [], "un cliente sin teléfonos no rompe el map");

// ── Entidades ───────────────────────────────────────────────────────
const cliente = aClienteListado(FILA_CLIENTE, 5, "Juan Pérez");
assert.equal(cliente.dni, "", "hay comercios sin DNI en producción (N.3)");
assert.equal(cliente.status, "Activo", "la columna status está en NULL para todas las filas");
assert.equal(cliente.localidadNombre, "San Miguel de Tucumán");

assert.equal(aCobrador(FILA_COBRADOR).id, 5, "la PK es id_Cobradores, no id");

const nota = aNota({
  id_Notes: 3,
  id_cliente: 105,
  Nota: "Pasar después de las 18",
  Fecha_Creacion: "2026-08-03 12:48:05",
  Fecha_UltimaEdicion: null,
} as FilaNota);
assert.equal(nota.fechaDeCreacion, "2026-08-03", "el datetime se recorta a fecha");
assert.equal(nota.fechaUltimaEdicion, null);

// ── Cuota ───────────────────────────────────────────────────────────
const CLIENTES = new Map<number, ClienteListado>([[105, cliente]]);
const COBRADORES = new Map<number, string>([[5, "Juan Pérez"]]);

const cuota = aCuota(FILA_CUOTA, CLIENTES, COBRADORES);
assert.equal(cuota.id, 101, "la PK es id_Pagos_por_realizar");
assert.equal(typeof cuota.montoEsperado, "number", "si queda string, los totales concatenan");
assert.equal(cuota.montoEsperado, 75000);
assert.equal(cuota.cobradoPorNombre, "Juan Pérez", "el nombre sale de /cobradores, no de /cuotas");
assert.equal(cuota.fechaDePago, "2026-05-04", "el datetime se recorta: las stats agrupan por día");
assert.equal(cuota.cliente.telefonos.length, 1, "los teléfonos los aporta /clientes");

// Sin contexto se cae a lo que trajo la fila, sin romper.
const suelta = aCuota(FILA_CUOTA, new Map(), new Map());
assert.equal(suelta.cliente.nombreCompleto, "Kiosco El Milagro");
assert.equal(suelta.cliente.telefonos.length, 0);

// Cuota sin cobrador asignado: tiene que caer en algún lado, no desaparecer.
const huerfana = aCuota(
  { ...FILA_CUOTA, id_cobrador_asignado: null, cobrador_asignado_nombre: null },
  new Map(),
  new Map(),
);
assert.equal(huerfana.cobradorAsignadoId, 0);
assert.equal(huerfana.cobradorAsignadoNombre, "Sin asignar");

// ── Estado de cuenta ────────────────────────────────────────────────
// Respuesta real de /estado_cuenta?id_cliente=105, recortada a dos movimientos
// y con una advertencia agregada para cubrir la rama que el cliente 105 no tiene.
const ESTADO: RespuestaEstadoCuenta = {
  cliente: FILA_CLIENTE,
  telefonos: ["381-555-1234"],
  referentes: [],
  saldo: {
    total_esperado: 450000,
    total_recargos: 0,
    total_abonado: 225000,
    saldo_deudor: 225000,
    cuotas: 6,
  },
  planes: [
    {
      id_Plan_de_pagos: 14,
      Nombre: "Renovación de Heladera (July)",
      Status: "Activo",
      Monto_total: 300000,
      total_esperado: 300000,
      total_abonado: 75000,
      saldo_deudor: 225000,
      cuotas: 4,
    },
  ],
  movimientos: [
    {
      Tipo_Registro: "Cuota",
      Plan_ID: 14,
      Plan_Nombre: "Renovación de Heladera (July)",
      Plan_Status: "Activo",
      Plan_Monto_Total: "300000.00",
      PPR_ID: 103,
      PPR_Fecha_Acordada: "2026-07-13",
      PPR_Monto_Esperado: "75000.00",
      PPR_Estado: "Pagado",
      PR_Monto_Abonado: "75000.00",
      PR_Concepto: "Pago en término",
      PR_Fecha_de_Pago: "2026-07-13 09:15:00",
      Adv_Motivo: null,
      Adv_Recargo: "0.00",
    },
    {
      Tipo_Registro: "Cuota",
      Plan_ID: 14,
      Plan_Nombre: "Renovación de Heladera (July)",
      Plan_Status: "Activo",
      Plan_Monto_Total: "300000.00",
      PPR_ID: 104,
      PPR_Fecha_Acordada: "2026-07-20",
      PPR_Monto_Esperado: "75000.00",
      PPR_Estado: "Pendiente",
      PR_Monto_Abonado: null,
      PR_Concepto: null,
      PR_Fecha_de_Pago: null,
      Adv_Motivo: null,
      Adv_Recargo: "0.00",
    },
    {
      // Una advertencia: monto esperado 0 y el recargo aparte (decisión N.2).
      Tipo_Registro: "Advertencia",
      Plan_ID: 14,
      Plan_Nombre: "Renovación de Heladera (July)",
      Plan_Status: "Activo",
      Plan_Monto_Total: "300000.00",
      PPR_ID: null,
      PPR_Fecha_Acordada: "2026-07-25",
      PPR_Monto_Esperado: "0.00",
      PPR_Estado: null,
      PR_Monto_Abonado: null,
      PR_Concepto: null,
      PR_Fecha_de_Pago: null,
      Adv_Motivo: "Mora de 5 días",
      Adv_Recargo: "5000.00",
    },
  ],
};

const ec = aEstadoDeCuenta(ESTADO, HOY);
assert.equal(ec.clienteId, 105);
assert.equal(ec.totalPagado, 225000, "el saldo lo calcula la API, no se recalcula");
assert.equal(ec.saldoPendiente, 225000);
assert.equal(ec.planes.length, 1);

const plan = ec.planes[0];
assert.equal(plan.cuotasTotales, 2, "la advertencia no cuenta como cuota");
assert.equal(plan.cuotasPagadas, 1);
assert.equal(plan.montoTotal, 300000);
// Las dos cuotas son de julio y HOY es agosto: la pendiente ya venció.
assert.equal(plan.vencido, 75000, "vencido = no pagada con fecha pasada");
assert.deepEqual(plan.proximaCuota, { fecha: "2026-07-20", monto: 75000 });
assert.equal(plan.movimientos.length, 3, "los movimientos sí incluyen la advertencia");

const advertencia = plan.movimientos.find((m) => m.estado === "Recargo");
assert.ok(advertencia, "la advertencia se mapea como movimiento de Recargo");
assert.equal(advertencia.monto, 5000, "el monto de una advertencia es el recargo, no la cuota");
assert.equal(advertencia.concepto, "Mora de 5 días");

const cobrada = plan.movimientos.find((m) => m.estado === "Pagado");
assert.ok(cobrada);
assert.equal(cobrada.fecha, "2026-07-13", "si ya se cobró, la fecha es la del pago");
assert.equal(cobrada.monto, 75000);

console.log("✓ mapear.ts OK");
