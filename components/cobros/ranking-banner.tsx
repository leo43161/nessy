"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/format";
import type { EstadisticasCobrador } from "@/types";

const ORDINALES = ["primero", "segundo", "tercero", "cuarto", "quinto", "sexto"];

function ordinal(puesto: number): string {
  return ORDINALES[puesto - 1] ?? `${puesto}º`;
}

/** Banner con el ranking y desempeño del cobrador (rojo si es el último) */
export function RankingBanner({ stats }: { stats: EstadisticasCobrador | null }) {
  if (!stats) return null;

  const esUltimo = stats.miPuesto === stats.totalCobradores && stats.totalCobradores > 1;
  const esPrimero = stats.miPuesto === 1;

  const mensaje = esPrimero
    ? "¡Sos el mejor cobrador del día! Seguí así."
    : `Estás ${ordinal(stats.miPuesto)} de ${stats.totalCobradores} cobradores. Tu desempeño es ${fmtPct(stats.brechaConElMejor)} menor que el del mejor.`;

  return (
    <div
      className={cn(
        "mb-3.5 flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 shadow-sm",
        esUltimo
          ? "border-l-red-500 bg-red-50 dark:bg-red-950/40"
          : esPrimero
            ? "border-l-green-500 bg-green-50 dark:bg-green-950/40"
            : "border-l-orange-500 bg-orange-50 dark:bg-orange-950/40"
      )}
    >
      <Trophy
        className={cn(
          "size-5 shrink-0",
          esUltimo ? "text-red-500" : esPrimero ? "text-green-500" : "text-orange-500"
        )}
      />
      <p
        className={cn(
          "text-[0.8rem] leading-snug font-medium",
          esUltimo && "text-red-800 dark:text-red-200"
        )}
      >
        {mensaje}
      </p>
    </div>
  );
}
