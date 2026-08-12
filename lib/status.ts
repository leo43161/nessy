import type { ClienteStatus, PagoEstado, PlanStatus } from "@/types";

interface PagoEstadoMeta {
  /** "✅ Pagado" */
  label: string;
  /** Etiqueta corta para pills con poco espacio */
  short: string;
  /** Badge de estado (fondo suave + texto) */
  badge: string;
  /** Borde izquierdo de las cards */
  border: string;
  /** Pill de filtro activa */
  pill: string;
  /** Botón de registro de pago en el detalle */
  selected: string;
  /** Color pleno (barras de estadísticas) */
  bar: string;
}

export const PAGO_ESTADO: Record<PagoEstado, PagoEstadoMeta> = {
  Pendiente: {
    label: "⏳ Pendiente",
    short: "⏳ Pend.",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    border: "border-l-blue-500",
    pill: "bg-blue-500 text-white",
    selected:
      "bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700",
    bar: "bg-blue-500",
  },
  Pagado: {
    label: "✅ Pagado",
    short: "✅ Pagado",
    badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    border: "border-l-green-500",
    pill: "bg-green-500 text-white",
    selected:
      "bg-green-100 text-green-800 border-green-400 dark:bg-green-950 dark:text-green-300 dark:border-green-700",
    bar: "bg-green-500",
  },
};

export const PAGO_ESTADOS: PagoEstado[] = ["Pendiente", "Pagado"];

/**
 * Cómo se llama el cobro según cuánto entró. No es un estado de la cuota: la
 * cuota queda `Pagado` en los tres casos. Es la misma deducción que hace la
 * API para elegir el stored procedure, replicada para poder nombrarlo en la
 * UI antes de mandarlo.
 */
export type TipoDeCobro = "ideal" | "parcial" | "adelantado";

export function tipoDeCobro(monto: number, esperado: number): TipoDeCobro {
  // En centavos enteros, igual que la API: con una tolerancia sobre floats un
  // centavo de diferencia cae del lado equivocado por el redondeo binario.
  const m = Math.round(monto * 100);
  const e = Math.round(esperado * 100);
  if (m === e) return "ideal";
  return m < e ? "parcial" : "adelantado";
}

export const TIPO_DE_COBRO_LABEL: Record<TipoDeCobro, string> = {
  ideal: "Cobro completo",
  parcial: "Cobro parcial",
  adelantado: "Adelanta cuotas futuras",
};

/** Concepto por defecto del pago realizado según cuánto entró */
export const CONCEPTO_POR_TIPO: Record<TipoDeCobro, string> = {
  ideal: "Cuota cobrada",
  parcial: "Pago parcial",
  adelantado: "Pago adelantado",
};

/** Un pago con alguno de estos estados cuenta como cobrado */
export const ESTADOS_COBRADOS: PagoEstado[] = ["Pagado"];

export function esCobrado(estado: PagoEstado): boolean {
  return ESTADOS_COBRADOS.includes(estado);
}

/** Motivos frecuentes de advertencia, para no escribirlos a mano cada vez */
export const MOTIVOS_ADVERTENCIA = [
  "Cliente incomunicado",
  "No estaba en el domicilio",
  "Pidió pasar otro día",
  "Se negó a pagar",
];

/** Vencido (derivado): sigue pendiente y la fecha acordada ya pasó */
export function esVencido(estado: PagoEstado, fechaAcordada: string, hoy: string): boolean {
  return estado === "Pendiente" && fechaAcordada < hoy;
}

export const CLIENTE_BORDER: Record<ClienteStatus, string> = {
  Activo: "border-l-green-500",
  Inactivo: "border-l-muted-foreground/40",
};

export const PLAN_STATUS_BADGE: Record<PlanStatus, string> = {
  Activo: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  Completado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Incumplido: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Refinanciado: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};
