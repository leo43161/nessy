"use client";

import { MapPin } from "lucide-react";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { cn } from "@/lib/utils";
import { CLIENTE_BORDER } from "@/lib/status";
import type { ClienteListado } from "@/types";

interface ClienteCardProps {
  cliente: ClienteListado;
  /** true → muestra el cobrador asignado (modo "todos los clientes") */
  mostrarCobrador?: boolean;
  onClick: () => void;
}

export function ClienteCard({ cliente, mostrarCobrador, onClick }: ClienteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-xl border border-l-4 bg-card px-4 py-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        CLIENTE_BORDER[cliente.status]
      )}
    >
      <InitialsAvatar nombre={cliente.nombreCompleto} size="md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{cliente.nombreCompleto}</div>
        <div className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{cliente.localidadNombre ?? "Sin localidad"}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs font-medium text-muted-foreground">DNI {cliente.dni}</div>
        {mostrarCobrador && cliente.cobradorAsignadoNombre && (
          <div className="mt-0.5 text-[0.68rem] text-muted-foreground">
            {cliente.cobradorAsignadoNombre.split(" ")[0]}
          </div>
        )}
      </div>
    </button>
  );
}
