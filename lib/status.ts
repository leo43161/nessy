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
  Adelanto: {
    label: "⏫ Adelanto",
    short: "⏫ Adelanto",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
    border: "border-l-teal-500",
    pill: "bg-teal-500 text-white",
    selected:
      "bg-teal-100 text-teal-800 border-teal-400 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-700",
    bar: "bg-teal-500",
  },
  Recargo: {
    label: "💰 Recargo",
    short: "💰 Recargo",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    border: "border-l-amber-500",
    pill: "bg-amber-500 text-white",
    selected:
      "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700",
    bar: "bg-amber-500",
  },
  Incomunicado: {
    label: "📵 Incomunicado",
    short: "📵 Incom.",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    border: "border-l-violet-500",
    pill: "bg-violet-500 text-white",
    selected:
      "bg-violet-100 text-violet-800 border-violet-400 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-700",
    bar: "bg-violet-500",
  },
};

export const PAGO_ESTADOS: PagoEstado[] = [
  "Pendiente",
  "Pagado",
  "Adelanto",
  "Recargo",
  "Incomunicado",
];

/** Estados que puede registrar el cobrador con un click */
export const ESTADOS_REGISTRABLES: Exclude<PagoEstado, "Pendiente">[] = [
  "Pagado",
  "Adelanto",
  "Recargo",
  "Incomunicado",
];

/** Concepto por defecto del pago realizado según el estado registrado */
export const CONCEPTO_POR_ESTADO: Record<Exclude<PagoEstado, "Pendiente">, string> = {
  Pagado: "Cuota cobrada",
  Adelanto: "Pago adelantado",
  Recargo: "Pago con recargo",
  Incomunicado: "Cliente incomunicado",
};

/** Un pago con alguno de estos estados cuenta como cobrado */
export const ESTADOS_COBRADOS: PagoEstado[] = ["Pagado", "Adelanto", "Recargo"];

export function esCobrado(estado: PagoEstado): boolean {
  return ESTADOS_COBRADOS.includes(estado);
}

/** Vencido (derivado): sigue pendiente y la fecha acordada ya pasó */
export function esVencido(estado: PagoEstado, fechaAcordada: string, hoy: string): boolean {
  return estado === "Pendiente" && fechaAcordada < hoy;
}

export const CLIENTE_BORDER: Record<ClienteStatus, string> = {
  Activo: "border-l-green-500",
  Inactivo: "border-l-muted-foreground/40",
  Moroso: "border-l-red-500",
};

export const PLAN_STATUS_BADGE: Record<PlanStatus, string> = {
  Activo: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  Completado: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Incumplido: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  Refinanciado: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};
