import type { CobroStatus, ClienteEstatus } from "@/types";

interface CobroStatusMeta {
  /** "✅ Cobrado" */
  label: string;
  /** Etiqueta corta para pills con poco espacio */
  short: string;
  /** Badge de estado (fondo suave + texto) */
  badge: string;
  /** Borde izquierdo de las cards */
  border: string;
  /** Pill de filtro activa */
  pill: string;
  /** Botón de selección de estado en el detalle */
  selected: string;
  /** Color pleno (barras de estadísticas) */
  bar: string;
}

export const COBRO_STATUS: Record<CobroStatus, CobroStatusMeta> = {
  Paid: {
    label: "✅ Cobrado",
    short: "✅ Cobrado",
    badge: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    border: "border-l-green-500",
    pill: "bg-green-500 text-white",
    selected:
      "bg-green-100 text-green-800 border-green-400 dark:bg-green-950 dark:text-green-300 dark:border-green-700",
    bar: "bg-green-500",
  },
  Pending: {
    label: "⏳ Pendiente",
    short: "⏳ Pendiente",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    border: "border-l-blue-500",
    pill: "bg-blue-500 text-white",
    selected:
      "bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700",
    bar: "bg-blue-500",
  },
  Overdue: {
    label: "🔴 No pagó",
    short: "🔴 No pagó",
    badge: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    border: "border-l-red-500",
    pill: "bg-red-500 text-white",
    selected:
      "bg-red-100 text-red-800 border-red-400 dark:bg-red-950 dark:text-red-300 dark:border-red-700",
    bar: "bg-red-500",
  },
  Unreachable: {
    label: "📵 Ilocalizable",
    short: "📵 Ilocal.",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    border: "border-l-violet-500",
    pill: "bg-violet-500 text-white",
    selected:
      "bg-violet-100 text-violet-800 border-violet-400 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-700",
    bar: "bg-violet-500",
  },
};

export const COBRO_STATUSES: CobroStatus[] = [
  "Paid",
  "Pending",
  "Overdue",
  "Unreachable",
];

/** Borde izquierdo de la card de cliente según su estatus */
export const CLIENTE_BORDER: Record<ClienteEstatus, string> = {
  Activo: "border-l-green-500",
  Inactivo: "border-l-muted-foreground/40",
  Moroso: "border-l-red-500",
};
