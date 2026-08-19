"use client";

import { cn } from "@/lib/utils";
import { esCobrado, esVencido } from "@/lib/status";
import { fmtMoney, todayISO } from "@/lib/format";
import type { CobroDelDia } from "@/types";

/** Mini-tarjetas con el resumen del worklist */
export function CobrosSummary({ cobros }: { cobros: CobroDelDia[] }) {
  const hoy = todayISO();
  // Recargos e incomunicados ya no son estados de cuota (N.4): el primero sale
  // de una advertencia y el segundo es una advertencia. En su lugar se muestra
  // lo que el cobrador sí necesita ver de un vistazo: qué vence y cuánta plata.
  const total = cobros.length;
  const cobrados = cobros.filter((c) => esCobrado(c.estado)).length;
  const pendientes = cobros.filter((c) => c.estado === "Pendiente").length;
  const vencidos = cobros.filter((c) => esVencido(c.estado, c.fechaAcordada, hoy)).length;
  const porCobrar = cobros
    .filter((c) => !esCobrado(c.estado))
    .reduce((s, c) => s + c.montoEsperado, 0);

  const stats = [
    { valor: `${cobrados}/${total}`, label: "Cobrados", highlight: true },
    { valor: pendientes, label: "Pendientes" },
    { valor: vencidos, label: "Vencidos", color: "text-red-500" },
    { valor: fmtMoney(porCobrar), label: "Por cobrar" },
  ];

  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "rounded-lg border px-2.5 py-2 text-center shadow-sm",
            s.highlight
              ? "border-transparent bg-linear-to-br from-primary to-primary-dark text-primary-foreground"
              : "bg-card"
          )}
        >
          <div className={cn("font-mono text-base font-bold", !s.highlight && s.color)}>
            {s.valor}
          </div>
          <div
            className={cn(
              "text-[0.58rem] font-semibold tracking-wide uppercase",
              s.highlight ? "text-white/75" : "text-muted-foreground"
            )}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
