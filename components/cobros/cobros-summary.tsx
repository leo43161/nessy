"use client";

import { cn } from "@/lib/utils";
import { esCobrado } from "@/lib/status";
import type { CobroDelDia } from "@/types";

/** Mini-tarjetas con el resumen del worklist */
export function CobrosSummary({ cobros }: { cobros: CobroDelDia[] }) {
  const total = cobros.length;
  const cobrados = cobros.filter((c) => esCobrado(c.estado)).length;
  const pendientes = cobros.filter((c) => c.estado === "Pendiente").length;
  const recargos = cobros.filter((c) => c.estado === "Recargo").length;
  const incomunicados = cobros.filter((c) => c.estado === "Incomunicado").length;

  const stats = [
    { valor: `${cobrados}/${total}`, label: "Cobrados", highlight: true },
    { valor: pendientes, label: "Pendientes" },
    { valor: recargos, label: "Recargos", color: "text-amber-500" },
    { valor: incomunicados, label: "Incomunicados", color: "text-violet-500" },
  ];

  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "rounded-lg border px-2.5 py-2 text-center shadow-sm",
            s.highlight
              ? "border-transparent bg-gradient-to-br from-orange-500 to-orange-600 text-white"
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
