"use client";

import { AlertTriangle, MapPin } from "lucide-react";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import { esVencido, PAGO_ESTADO } from "@/lib/status";
import type { CobroDelDia } from "@/types";

interface CobroCardProps {
  cobro: CobroDelDia;
  hoy: string;
  /** true → modo asistencia: muestra el cobrador asignado */
  mostrarCobrador?: boolean;
  onClick: () => void;
}

export function CobroCard({ cobro, hoy, mostrarCobrador, onClick }: CobroCardProps) {
  const moroso = cobro.cliente.status === "Moroso";
  const vencido = esVencido(cobro.estado, cobro.fechaAcordada, hoy);
  const fueraDeRango = cobro.dentroRango === false;
  const asistencia = cobro.cobradoPorId != null && cobro.cobradoPorId !== cobro.cobradorAsignadoId;

  const borde = vencido ? "border-l-red-500" : PAGO_ESTADO[cobro.estado].border;

  const sub: string[] = [cobro.planNombre];
  if (cobro.cliente.localidadNombre) sub.push(cobro.cliente.localidadNombre);
  if (mostrarCobrador) sub.push(`Asignado: ${cobro.cobradorAsignadoNombre}`);
  else if (asistencia) sub.push(`Cobró ${cobro.cobradoPorNombre}`);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-l-4 bg-card px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        borde
      )}
    >
      <InitialsAvatar nombre={cobro.cliente.nombreCompleto} moroso={moroso} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{cobro.cliente.nombreCompleto}</span>
          {moroso && <span>⚠️</span>}
          {fueraDeRango && (
            <span
              title="Cobro registrado fuera de rango"
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.58rem] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              <AlertTriangle className="size-2.5" />
              Fuera de rango
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{sub.join(" · ")}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-bold">{fmtMoney(cobro.montoEsperado)}</div>
        <StatusBadge estado={cobro.estado} vencido={vencido} className="mt-0.5" />
      </div>
    </button>
  );
}
