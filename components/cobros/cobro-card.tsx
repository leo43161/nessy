"use client";

import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import { COBRO_STATUS } from "@/lib/status";
import type { CobroDia, Cobrador } from "@/types";

interface CobroCardProps {
  cobro: CobroDia;
  cobradores: Cobrador[];
  onClick: () => void;
}

export function CobroCard({ cobro, cobradores, onClick }: CobroCardProps) {
  const moroso = cobro.cliente.estatus === "Moroso";
  const scCobrador = cobro.scCobradorId
    ? cobradores.find((c) => c.id === cobro.scCobradorId)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-l-4 bg-card px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        COBRO_STATUS[cobro.status].border
      )}
    >
      <InitialsAvatar nombre={cobro.cliente.nombre} moroso={moroso} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">
          {cobro.cliente.nombre}
          {moroso && " ⚠️"}
        </div>
        <div className="text-[0.7rem] text-muted-foreground">
          {cobro.frecuencia}
          {scCobrador && ` · Cobrado por ${scCobrador.nombre}`}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-bold">
          {fmtMoney(cobro.monto, cobro.cliente.moneda)}
        </div>
        <StatusBadge status={cobro.status} className="mt-0.5" />
      </div>
    </button>
  );
}
