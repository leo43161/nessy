"use client";

import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import { CLIENTE_BORDER } from "@/lib/status";
import type { ClienteResumen } from "@/types";

interface ClienteCardProps {
  cliente: ClienteResumen;
  onClick: () => void;
}

export function ClienteCard({ cliente, onClick }: ClienteCardProps) {
  const moroso = cliente.estatus === "Moroso";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-l-4 bg-card px-4 py-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        CLIENTE_BORDER[cliente.estatus]
      )}
    >
      <InitialsAvatar nombre={cliente.nombre} moroso={moroso} size="md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">
          {cliente.nombre}
          {moroso && " ⚠️"}
        </div>
        <div className="text-xs text-muted-foreground">{cliente.estatus}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm font-bold">
          {fmtMoney(cliente.totalCobrado, cliente.moneda)}
        </div>
        <div className="mt-0.5 text-[0.68rem] text-muted-foreground">
          {cliente.frecuencia ?? "—"}
        </div>
      </div>
    </button>
  );
}
