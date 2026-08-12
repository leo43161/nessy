// ════════════════════════════════════════════════════════════════
//  Modelos de datos alineados al esquema real de la DB (SQL_21-7)
//  Tablas: Clientes, Referentes, Cobradores, Telefonos, Notas,
//  Cuenta/Roles, Localidades_y_regiones, Cuenta_Corriente,
//  Plan_de_pagos, Pagos_por_realizar, Pagos_realizados,
//  Advertencias_y_retrasos
// ════════════════════════════════════════════════════════════════

/** Estado de un pago por realizar (Pagos_por_realizar.Estado).
 *  "Vencido" no se guarda: se deriva (Pendiente con fecha pasada). */
/**
 * Estado de un pago por realizar (`Pagos_por_realizar.Estado`).
 *
 * Decisión N.4: **manda la base**. La columna solo guarda `Pendiente`,
 * `Pagado` y `Atrasado`, y `Atrasado` se traduce a `Pendiente` al mapear
 * porque el front deriva "Vencido" de la fecha.
 *
 * Los tres estados que traía la maqueta ya no viven acá:
 *   - `Incomunicado` es una **advertencia** (`POST /advertencias`), no un
 *     estado de la cuota.
 *   - `Adelanto` se deduce: se cobró más que lo esperado.
 *   - `Recargo` sale de una advertencia con monto, no de la cuota.
 */
export type PagoEstado = "Pendiente" | "Pagado";

/** Plan_de_pagos.Status */
export type PlanStatus = "Activo" | "Completado" | "Incumplido" | "Refinanciado";

/**
 * `Clientes.status`. **No es la baja del cliente** — eso es `Clientes.Activo`,
 * que maneja el borrado lógico. Es una etiqueta libre que la base trae en NULL
 * para todas las filas.
 */
export type ClienteStatus = "Activo" | "Inactivo";

export interface Localidad {
  id: number;
  nombre: string;
}

/** Campos compartidos por Clientes / Referentes / Cobradores en la DB */
export interface PersonaBase {
  id: number;
  dni: string;
  nombreCompleto: string;
  email: string | null;
  codigoPostal: string | null;
  direccion: string | null;
  casaODeptoDirecc1: string | null;
  direccionLaboralOAlternativa: string | null;
  casaODeptoDirecc2: string | null;
  img: string | null;
  fechaDeNacimiento: string | null; // YYYY-MM-DD
  idLocalidad: number | null;
}

export interface Cliente extends PersonaBase {
  /** ubicacion_geografica_de_destino_de_cobro */
  ubicacionCobro: string | null;
  status: ClienteStatus;
}

export type Referente = PersonaBase;

export type Cobrador = PersonaBase;

/** Telefonos es polimórfica (id_tabla + id_entidad): una entidad tiene N teléfonos */
export interface Telefono {
  id: number;
  numero: string;
}

export interface Nota {
  id: number;
  idCliente: number;
  nota: string;
  fechaDeCreacion: string; // YYYY-MM-DD
  fechaUltimaEdicion: string | null;
}

export interface CuentaCorriente {
  id: number;
  idCliente: number;
  fechaDeCreacion: string;
}

export interface PlanDePagos {
  id: number;
  idCuentaCorriente: number;
  nombre: string;
  montoTotal: number;
  status: PlanStatus;
}

export interface PagoPorRealizar {
  id: number;
  idPlanDePago: number;
  fechaAcordada: string; // YYYY-MM-DD
  montoEsperado: number;
  /** false → el admin lo ve como cobro fuera de rango */
  dentroRango: boolean | null;
  estado: PagoEstado;
}

export interface PagoRealizado {
  id: number;
  idPago: number;
  /** Quién cobró realmente (≠ asignado ⇒ asistencia) */
  idCobrador: number;
  concepto: string;
  fechaDePago: string;
}

// ── Auth (tablas Cuenta / Roles / Cuenta_Cobrador) ──

export interface Cuenta {
  id: number;
  nombreDeUsuario: string;
  rol: string;
}

export interface LoginPayload {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  cuenta: Cuenta;
  cobrador: Cobrador;
}

// ── View models (lo que arman los SP / endpoints para la UI) ──

/** Cobro del día: pago por realizar + plan + cliente + cobrador asignado */
export interface CobroDelDia {
  id: number; // id del pago por realizar
  planId: number;
  planNombre: string;
  fechaAcordada: string;
  montoEsperado: number;
  estado: PagoEstado;
  dentroRango: boolean | null;
  cobradorAsignadoId: number;
  cobradorAsignadoNombre: string;
  /** Quién lo cobró, si ya se registró (≠ asignado ⇒ asistencia) */
  cobradoPorId: number | null;
  cobradoPorNombre: string | null;
  /** Cuándo se cobró (YYYY-MM-DD), null si sigue sin cobrarse */
  fechaDePago: string | null;
  cliente: ClienteListado;
}

/** Cliente resumido para listados */
export interface ClienteListado {
  id: number;
  dni: string;
  nombreCompleto: string;
  status: ClienteStatus;
  direccion: string | null;
  ubicacionCobro: string | null;
  idLocalidad: number | null;
  localidadNombre: string | null;
  telefonos: Telefono[];
  cobradorAsignadoId: number | null;
  cobradorAsignadoNombre: string | null;
}

/** Referente de un cliente: puede ser de la tabla Referentes o un cliente-referente */
export interface ReferenteDeCliente {
  tipo: "Referente" | "Cliente";
  id: number;
  dni: string;
  nombreCompleto: string;
  direccion: string | null;
  localidadNombre: string | null;
  telefonos: Telefono[];
}

/** Detalle completo para el modal de cliente */
export interface ClienteDetalle {
  cliente: Cliente;
  localidadNombre: string | null;
  telefonos: Telefono[];
  cobradorAsignadoNombre: string | null;
  referentes: ReferenteDeCliente[];
  notas: Nota[];
  estadoDeCuenta: EstadoDeCuenta;
}

/** Estado de cuenta del cliente (para mostrar y compartir) */
export interface EstadoDeCuenta {
  clienteId: number;
  clienteNombre: string;
  generadoEl: string;
  planes: EstadoDeCuentaPlan[];
  totalPagado: number;
  saldoPendiente: number;
  totalVencido: number;
}

export interface EstadoDeCuentaPlan {
  planId: number;
  nombre: string;
  status: PlanStatus;
  montoTotal: number;
  cuotasTotales: number;
  cuotasPagadas: number;
  pagado: number;
  pendiente: number;
  vencido: number;
  proximaCuota: { fecha: string; monto: number } | null;
  /** Últimos movimientos del plan (cuotas con estado registrado) */
  movimientos: EstadoDeCuentaMovimiento[];
}

/**
 * Un movimiento del estado de cuenta.
 *
 * `/estado_cuenta` mezcla dos cosas en la misma lista: las cuotas y las
 * advertencias. Por eso el estado no es un `PagoEstado` — una advertencia no
 * es una cuota, es un recargo que vive aparte y se suma al saldo (N.2).
 */
export type MovimientoEstado = PagoEstado | "Recargo";

export interface EstadoDeCuentaMovimiento {
  fecha: string;
  concepto: string;
  monto: number;
  estado: MovimientoEstado;
}

// ── Estadísticas ──

export interface RankingCobrador {
  cobradorId: number;
  nombre: string;
  /** % de cobros del día efectivamente cobrados */
  efectividad: number;
  /** Dinero cobrado en el día */
  montoCobrado: number;
  puesto: number;
}

export interface EstadisticasCobrador {
  ranking: RankingCobrador[];
  miPuesto: number;
  totalCobradores: number;
  /** % debajo del mejor (0 si soy el mejor) */
  brechaConElMejor: number;
  /** % de efectividad de cobro (pagados / total) */
  efectividadPersonal: number;
  /** % de completitud (gestionados / total, cualquier estado ≠ Pendiente) */
  completitud: number;
  /** Veces que otro cobrador cubrió mis cobros en los últimos 6 meses (más = peor) */
  asistencias6Meses: number;
  /** Promedio de dinero por día */
  promedioDiario: number;
  /** Dinero perdido: cuotas vencidas + incomunicados sin cobrar */
  dineroPerdido: number;
}

// ── Payloads hacia la API ──

/**
 * Registrar un cobro (`POST /cobros`).
 *
 * No se elige el "tipo": lo deduce la API comparando `monto` con lo esperado
 * (igual → ideal, menor → parcial, mayor → adelantado), así el front no puede
 * elegir mal.
 */
export interface RegistrarPagoPayload {
  pagoId: number;
  /** Lo que entró de verdad. Puede ser menor o mayor a lo esperado (N.6). */
  monto: number;
  /** Obligatorio para la API. Sale de /catalogos/metodos_pago. */
  idMetodoDePago: number;
  /** Solo para el cobro parcial: cuándo se pactó el resto. */
  nuevaFecha?: string;
  concepto?: string;
  /** Cobrador que registra (para asistencias) */
  cobradorId: number;
  /** Ubicación del cobro (N.5). null = el navegador no la dio. */
  lat?: number | null;
  lon?: number | null;
}

/** Registrar una advertencia (`POST /advertencias`) — ej. cliente incomunicado */
export interface RegistrarAdvertenciaPayload {
  /** La advertencia cuelga del plan, no de la cuota */
  planId: number;
  motivo: string;
  recargo?: number;
}

export interface FiltroCobros {
  fecha: string;
  /** null → cobros de TODOS los cobradores (modo asistencia) */
  cobradorId: number | null;
  localidadId: number | null;
}

export interface FiltroClientes {
  /** null → todos los clientes */
  cobradorId: number | null;
  localidadId: number | null;
}

export interface NuevaNotaPayload {
  clienteId: number;
  contenido: string;
}

export interface EditarNotaPayload {
  notaId: number;
  contenido: string;
}
