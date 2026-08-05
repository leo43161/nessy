import { cn } from "@/lib/utils";
import { PAGO_ESTADO } from "@/lib/status";
import type { PagoEstado } from "@/types";

export function StatusBadge({
  estado,
  vencido,
  className,
}: {
  estado: PagoEstado;
  /** true → muestra "Vencido" (estado pendiente con fecha pasada) */
  vencido?: boolean;
  className?: string;
}) {
  if (vencido && estado === "Pendiente") {
    return (
      <span
        className={cn(
          "inline-block rounded-full bg-red-100 px-2 py-0.5 text-[0.65rem] font-bold whitespace-nowrap text-red-800 dark:bg-red-950 dark:text-red-300",
          className
        )}
      >
        🔴 Vencido
      </span>
    );
  }
  const meta = PAGO_ESTADO[estado];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold whitespace-nowrap",
        meta.badge,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
