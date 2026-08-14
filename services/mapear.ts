/**
 * Traducción API → tipos del front.
 *
 * La API devuelve las columnas de la base tal cual salen del SP: nombres
 * mezclados (`id_Pagos_por_realizar`, `Monto_esperado`, `PPR_Estado`) y
 * capitalización inconsistente. Los tipos del front son camelCase. Este
 * archivo es el único lugar donde conviven las dos convenciones.
 *
 * Es el gemelo de services/mapear.ts en nessy-admin: los dos proyectos son
 * independientes a propósito, así que cuando cambie el contrato hay que tocar
 * los dos. Este además mapea el estado de cuenta y las notas, que el panel
 * admin no usa.
 *
 * Las funciones son puras: reciben la fila cruda y devuelven el tipo. El
 * fetch y el join viven en los servicios. Su chequeo: `npm run check`.
 */
import type {
  Cliente,
  ClienteListado,
  Cobrador,
  CobroDelDia,
  EstadoDeCuenta,
  EstadoDeCuentaMovimiento,
  EstadoDeCuentaPlan,
  Nota,
  PagoEstado,
  PlanStatus,
  ReferenteDeCliente,
  Telefono,
} from "@/types";

/* ────────────────────────── filas de la API ────────────────────────── */

/** Fila de GET /cuotas */
export interface FilaCuota {
  id_Pagos_por_realizar: number;
  id_Plan_de_pago: number;
  fecha_acordada: string;
  Monto_esperado: string;
  Estado: string;
  Dentro_Rango: number | null;
  vencida: number;
  plan_nombre: string | null;
  plan_status: string | null;
  plan_monto_total: string | null;
  id_Clientes: number;
  cliente_nombre: string | null;
  cliente_dni: string | null;
  cliente_direccion: string | null;
  cliente_ubicacion: string | null;
  id_cobrador_asignado: number | null;
  cobradores_asignados: string | null;
  cobrador_asignado_nombre: string | null;
  id_cobrador_cobro: number | null;
  monto_abonado: string | null;
  fecha_de_pago: string | null;
  id_metodo_de_pago: number | null;
}

/** Fila de GET /clientes */
export interface FilaCliente {
  id_Clientes: number;
  DNI: string | null;
  Nombre_completo: string | null;
  email: string | null;
  codigo_postal: string | null;
  direccion: string | null;
  casa_o_dpt_direcc_1: string | null;
  direccion_laboral_o_alternativa: string | null;
  casa_o_dpt_direcc_2: string | null;
  ubicacion_geografica_de_destino_de_cobro: string | null;
  img: string | null;
  status: string | null;
  fecha_de_nacimiento: string | null;
  id_localidad: number | null;
  nombre_localidad?: string | null;
  id_Cuenta_Corriente?: number | null;
  telefonos?: string[];
}

/** Fila de GET /cobradores y /referentes (misma base de persona) */
export interface FilaPersona {
  DNI: string | null;
  Nombre_completo: string | null;
  email: string | null;
  codigo_postal: string | null;
  direccion: string | null;
  casa_o_dpt_direcc_1: string | null;
  direccion_laboral_o_alternativa: string | null;
  casa_o_dpt_direcc_2: string | null;
  img: string | null;
  fecha_de_nacimiento: string | null;
  id_localidad: number | null;
  id_Cobradores?: number;
  id_Referentes?: number;
  /** /cli_cliente devuelve filas de `Clientes`, con la PK de esa tabla */
  id_Clientes?: number;
  telefonos?: string[];
}

/** Fila de GET /notas */
/**
 * Fila de GET /notas.
 *
 * Los nombres son los que devuelve la API, verificados contra producción: no
 * siguen la convención de las otras tablas (`id_Notas` en plural, `id_Cliente`
 * con mayúscula, `fecha_de_creacion` en minúsculas).
 */
export interface FilaNota {
  id_Notas: number;
  id_Cliente: number;
  Nota: string | null;
  fecha_de_creacion: string | null;
  Fecha_UltimaEdicion?: string | null;
  cliente_nombre?: string | null;
}

/** Un movimiento de GET /estado_cuenta. Cuotas y advertencias vienen mezcladas. */
export interface FilaMovimiento {
  Tipo_Registro: string;
  Plan_ID: number;
  Plan_Nombre: string | null;
  Plan_Status: string | null;
  Plan_Monto_Total: string | null;
  PPR_ID: number | null;
  PPR_Fecha_Acordada: string | null;
  PPR_Monto_Esperado: string | null;
  PPR_Estado: string | null;
  PR_Monto_Abonado: string | null;
  PR_Concepto: string | null;
  PR_Fecha_de_Pago: string | null;
  Adv_Motivo: string | null;
  Adv_Recargo: string | null;
}

/** Resumen por plan de GET /estado_cuenta (ya viene sumado por el SP) */
export interface FilaPlanSaldo {
  id_Plan_de_pagos: number;
  Nombre: string | null;
  Status: string | null;
  Monto_total: number | string | null;
  total_esperado: number | string | null;
  total_abonado: number | string | null;
  saldo_deudor: number | string | null;
  cuotas: number;
}

/** Cuerpo de GET /estado_cuenta */
export interface RespuestaEstadoCuenta {
  cliente: FilaCliente;
  telefonos: string[];
  referentes: FilaPersona[];
  saldo: {
    total_esperado: number | string;
    total_recargos: number | string;
    total_abonado: number | string;
    saldo_deudor: number | string;
    cuotas: number;
  };
  planes: FilaPlanSaldo[];
  movimientos: FilaMovimiento[];
}

/* ────────────────────────── escalares ────────────────────────── */

/**
 * Las columnas DECIMAL viajan como string ("75000.00"): mysqli las devuelve
 * así y json_encode las deja tal cual. Si no se convierten, cualquier suma
 * termina concatenando. Ojo que /estado_cuenta mezcla los dos: los totales
 * que calcula la API son números, las columnas crudas siguen siendo strings.
 */
export function aNumero(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** tinyint(1) → boolean. `null` se conserva: "no se sabe" ≠ "fue fuera de rango". */
export function aBooleanoNullable(v: number | null | undefined): boolean | null {
  return v == null ? null : v === 1;
}

/**
 * La API manda los tres estados de la base: Pendiente, Pagado, Atrasado.
 *
 * `Atrasado` **ya no se traduce a `Pendiente`**. Lo pone el cobrador cuando fue
 * y no pudo cobrar, y esa gestión es justo lo que hay que poder distinguir de
 * una cuota vencida que nadie visitó.
 */
export function aEstadoCuota(estado: string | null): PagoEstado {
  if (estado === "Pagado") return "Pagado";
  if (estado === "Atrasado") return "Atrasado";
  return "Pendiente";
}

const PLAN_STATUSES: PlanStatus[] = ["Activo", "Completado", "Incumplido", "Refinanciado"];

export function aPlanStatus(status: string | null): PlanStatus {
  return PLAN_STATUSES.includes(status as PlanStatus) ? (status as PlanStatus) : "Activo";
}

/**
 * `Telefonos` es polimórfica y la API la aplana a un array de strings: manda
 * el número sin el id de la fila. El id se sintetiza con el índice, que
 * alcanza para las keys de React — no sirve para editar el teléfono.
 */
export function aTelefonos(numeros: string[] | undefined): Telefono[] {
  return (numeros ?? []).map((numero, i) => ({ id: i + 1, numero }));
}

/* ────────────────────────── entidades ────────────────────────── */

export function aClienteListado(
  f: FilaCliente,
  cobradorId?: number | null,
  cobradorNombre?: string | null,
): ClienteListado {
  return {
    id: f.id_Clientes,
    // Hay comercios cargados sin DNI ("Kiosco El Milagro"). Es la definición
    // de negocio N.3, todavía abierta: el tipo lo exige y la base no.
    dni: f.DNI ?? "",
    nombreCompleto: f.Nombre_completo ?? "—",
    // La columna existe pero en producción está en NULL para todas las filas.
    status: f.status === "Inactivo" ? "Inactivo" : "Activo",
    direccion: f.direccion,
    ubicacionCobro: f.ubicacion_geografica_de_destino_de_cobro,
    idLocalidad: f.id_localidad,
    localidadNombre: f.nombre_localidad ?? null,
    telefonos: aTelefonos(f.telefonos),
    cobradorAsignadoId: cobradorId ?? null,
    cobradorAsignadoNombre: cobradorNombre ?? null,
  };
}

export function aCliente(f: FilaCliente): Cliente {
  return {
    id: f.id_Clientes,
    dni: f.DNI ?? "",
    nombreCompleto: f.Nombre_completo ?? "—",
    email: f.email,
    codigoPostal: f.codigo_postal ?? null,
    direccion: f.direccion,
    casaODeptoDirecc1: f.casa_o_dpt_direcc_1 ?? null,
    direccionLaboralOAlternativa: f.direccion_laboral_o_alternativa ?? null,
    casaODeptoDirecc2: f.casa_o_dpt_direcc_2 ?? null,
    img: f.img ?? null,
    fechaDeNacimiento: f.fecha_de_nacimiento,
    idLocalidad: f.id_localidad,
    ubicacionCobro: f.ubicacion_geografica_de_destino_de_cobro,
    status: f.status === "Inactivo" ? "Inactivo" : "Activo",
  };
}

export function aCobrador(f: FilaPersona): Cobrador {
  return {
    id: f.id_Cobradores ?? f.id_Referentes ?? 0,
    dni: f.DNI ?? "",
    nombreCompleto: f.Nombre_completo ?? "—",
    email: f.email,
    codigoPostal: f.codigo_postal,
    direccion: f.direccion,
    casaODeptoDirecc1: f.casa_o_dpt_direcc_1,
    direccionLaboralOAlternativa: f.direccion_laboral_o_alternativa,
    casaODeptoDirecc2: f.casa_o_dpt_direcc_2,
    img: f.img,
    fechaDeNacimiento: f.fecha_de_nacimiento,
    idLocalidad: f.id_localidad,
  };
}

export function aReferenteDeCliente(f: FilaPersona): ReferenteDeCliente {
  return {
    // `tipo` distingue al garante externo (tabla Referentes) del cliente que
    // garantiza a otro (Cliente_ClienteReferente). /estado_cuenta devuelve
    // solo los primeros.
    tipo: "Referente",
    id: f.id_Referentes ?? 0,
    dni: f.DNI ?? "",
    nombreCompleto: f.Nombre_completo ?? "—",
    direccion: f.direccion,
    localidadNombre: null,
    telefonos: aTelefonos(f.telefonos),
  };
}

export function aNota(f: FilaNota): Nota {
  return {
    id: f.id_Notas,
    idCliente: f.id_Cliente,
    nota: f.Nota ?? "",
    fechaDeCreacion: (f.fecha_de_creacion ?? "").slice(0, 10),
    fechaUltimaEdicion: f.Fecha_UltimaEdicion ? f.Fecha_UltimaEdicion.slice(0, 10) : null,
  };
}

export function aCuota(
  f: FilaCuota,
  clientes: Map<number, ClienteListado>,
  cobradores: Map<number, string>,
): CobroDelDia {
  const enriquecido = clientes.get(f.id_Clientes);

  const cliente: ClienteListado = enriquecido
    ? {
        ...enriquecido,
        cobradorAsignadoId: f.id_cobrador_asignado,
        cobradorAsignadoNombre: f.cobrador_asignado_nombre,
      }
    : aClienteListado(
        {
          id_Clientes: f.id_Clientes,
          DNI: f.cliente_dni,
          Nombre_completo: f.cliente_nombre,
          email: null,
          codigo_postal: null,
          direccion: f.cliente_direccion,
          casa_o_dpt_direcc_1: null,
          direccion_laboral_o_alternativa: null,
          casa_o_dpt_direcc_2: null,
          ubicacion_geografica_de_destino_de_cobro: f.cliente_ubicacion,
          img: null,
          status: null,
          fecha_de_nacimiento: null,
          id_localidad: null,
        },
        f.id_cobrador_asignado,
        f.cobrador_asignado_nombre,
      );

  return {
    id: f.id_Pagos_por_realizar,
    planId: f.id_Plan_de_pago,
    planNombre: f.plan_nombre ?? "—",
    fechaAcordada: f.fecha_acordada,
    montoEsperado: aNumero(f.Monto_esperado),
    estado: aEstadoCuota(f.Estado),
    dentroRango: aBooleanoNullable(f.Dentro_Rango),
    // Sin asignación la cuota quedaría fuera de todo agrupamiento: 0 es
    // "sin asignar".
    cobradorAsignadoId: f.id_cobrador_asignado ?? 0,
    cobradorAsignadoNombre: f.cobrador_asignado_nombre ?? "Sin asignar",
    cobradoPorId: f.id_cobrador_cobro,
    cobradoPorNombre:
      f.id_cobrador_cobro == null ? null : (cobradores.get(f.id_cobrador_cobro) ?? "—"),
    // Llega como datetime ("2026-07-13 09:15:00"); las estadísticas agrupan por día.
    fechaDePago: f.fecha_de_pago ? f.fecha_de_pago.slice(0, 10) : null,
    cliente,
  };
}

/* ────────────────────────── estado de cuenta ────────────────────────── */

/**
 * `/estado_cuenta` devuelve la ficha entera en un request: cliente, teléfonos,
 * referentes, saldo ya calculado, resumen por plan y movimientos.
 *
 * Los movimientos mezclan dos cosas en la misma lista, distinguidas por
 * `Tipo_Registro`: las cuotas y las advertencias. Una advertencia llega con
 * `PPR_Monto_Esperado = 0` y el recargo en `Adv_Recargo` — no está dentro de
 * ninguna cuota (decisión N.2), y la API ya la sumó al saldo_deudor.
 */
export function aEstadoDeCuenta(r: RespuestaEstadoCuenta, hoy: string): EstadoDeCuenta {
  const planes = r.planes.map<EstadoDeCuentaPlan>((p) => {
    const movs = r.movimientos.filter((m) => m.Plan_ID === p.id_Plan_de_pagos);
    const cuotas = movs.filter((m) => m.Tipo_Registro === "Cuota");
    const pagadas = cuotas.filter((m) => m.PPR_Estado === "Pagado");

    // Vencido: no pagada y con la fecha acordada ya pasada. No se guarda.
    const vencido = cuotas
      .filter((m) => m.PPR_Estado !== "Pagado" && (m.PPR_Fecha_Acordada ?? "") < hoy)
      .reduce((s, m) => s + aNumero(m.PPR_Monto_Esperado), 0);

    const pendientes = cuotas
      .filter((m) => m.PPR_Estado !== "Pagado")
      .sort((a, b) => (a.PPR_Fecha_Acordada ?? "").localeCompare(b.PPR_Fecha_Acordada ?? ""));

    return {
      planId: p.id_Plan_de_pagos,
      nombre: p.Nombre ?? "—",
      status: aPlanStatus(p.Status),
      montoTotal: aNumero(p.Monto_total),
      cuotasTotales: cuotas.length,
      cuotasPagadas: pagadas.length,
      pagado: aNumero(p.total_abonado),
      pendiente: aNumero(p.saldo_deudor),
      vencido,
      proximaCuota: pendientes[0]
        ? {
            fecha: pendientes[0].PPR_Fecha_Acordada ?? "",
            monto: aNumero(pendientes[0].PPR_Monto_Esperado),
          }
        : null,
      movimientos: movs.map(aMovimiento),
    };
  });

  return {
    clienteId: r.cliente.id_Clientes,
    clienteNombre: r.cliente.Nombre_completo ?? "—",
    generadoEl: hoy,
    planes,
    totalPagado: aNumero(r.saldo.total_abonado),
    saldoPendiente: aNumero(r.saldo.saldo_deudor),
    totalVencido: planes.reduce((s, p) => s + p.vencido, 0),
  };
}

function aMovimiento(m: FilaMovimiento): EstadoDeCuentaMovimiento {
  if (m.Tipo_Registro === "Advertencia") {
    return {
      fecha: m.PPR_Fecha_Acordada ?? "",
      concepto: m.Adv_Motivo ?? "Recargo",
      monto: aNumero(m.Adv_Recargo),
      estado: "Recargo",
    };
  }

  return {
    // Si ya se cobró, lo que importa es cuándo se cobró; si no, cuándo vence.
    fecha: (m.PR_Fecha_de_Pago ?? m.PPR_Fecha_Acordada ?? "").slice(0, 10),
    concepto: m.PR_Concepto ?? "Cuota",
    monto: aNumero(m.PR_Monto_Abonado) || aNumero(m.PPR_Monto_Esperado),
    estado: aEstadoCuota(m.PPR_Estado),
  };
}
