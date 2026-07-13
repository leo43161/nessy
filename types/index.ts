// ── Modelos de datos del sistema (alineados a la maqueta / futura API) ──

export type Moneda = "ARP" | "USD";

export type ClienteEstatus = "Activo" | "Inactivo" | "Moroso";

export type Frecuencia =
  | "Diaria"
  | "Semanal"
  | "Quincenal"
  | "Mensual"
  | "Pago Único";

/** Estado de un cobro puntual del día */
export type CobroStatus = "Paid" | "Pending" | "Overdue" | "Unreachable";

/** Estado de un esquema de pago (financiación) */
export type ScheduleStatus = "Active" | "Completed" | "Defaulted" | "Refinanced";

export type TransaccionTipo = "CARGO" | "PAGO";

export interface Cobrador {
  id: number;
  nombre: string;
  telefono?: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  moneda: Moneda;
  estatus: ClienteEstatus;
  creado: string; // YYYY-MM-DD
}

/** Esquema de pago acordado con el cliente (financiación) */
export interface PaymentSchedule {
  id: number;
  clienteId: number;
  cobradorId: number;
  pagoAcordado: number;
  frecuencia: Frecuencia;
  status: ScheduleStatus;
  active: boolean;
}

/** Cobro programado para un día concreto, ya "joineado" con su cliente */
export interface CobroDia {
  id: number;
  scheduleId: number;
  fecha: string; // YYYY-MM-DD
  monto: number;
  status: CobroStatus;
  frecuencia: Frecuencia;
  /** Caso especial: otro cobrador realizó el cobro */
  scCobradorId: number | null;
  scNotas: string | null;
  cliente: Cliente;
}

export interface Transaccion {
  id: number;
  clienteId: number;
  cobroId: number | null;
  tipo: TransaccionTipo;
  concepto: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
}

export interface Nota {
  id: number;
  clienteId: number;
  clienteNombre: string;
  contenido: string;
  fecha: string; // YYYY-MM-DD
}

/** Cliente con el resumen que se muestra en la lista / balance */
export interface ClienteResumen extends Cliente {
  pagoAcordado: number | null;
  frecuencia: Frecuencia | null;
  cobradorNombre: string | null;
  totalCobrado: number;
}

// ── Payloads hacia la API ──

export interface LoginPayload {
  usuario: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Cobrador;
}

export interface ActualizarCobroPayload {
  id: number;
  status: CobroStatus;
  scCobradorId?: number | null;
  scNotas?: string | null;
}

export interface NuevoClientePayload {
  nombre: string;
  telefono: string;
  moneda: Moneda;
  estatus: ClienteEstatus;
  cobradorId: number;
}

export interface NuevoCargoPayload {
  clienteId: number;
  concepto: string;
  monto: number;
  anticipo: number;
  /** true = se salda al momento, sin esquema de cuotas */
  pagoContado: boolean;
  pagoAcordado?: number;
  esquema?: Frecuencia;
}

export interface NuevoPagoPayload {
  clienteId: number;
  concepto: string;
  monto: number;
}

export interface NuevaNotaPayload {
  clienteId: number;
  contenido: string;
}

/** Resumen del día para el dashboard de estadísticas */
export interface ResumenDia {
  totalCobros: number;
  cobrados: number;
  pendientes: number;
  vencidos: number;
  ilocalizables: number;
  montoCobrado: number;
  totalTransacciones: number;
}
