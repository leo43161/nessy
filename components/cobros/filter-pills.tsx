"use client";

import { cn } from "@/lib/utils";
import { PAGO_ESTADO, PAGO_ESTADOS } from "@/lib/status";
import type { CobroDelDia, PagoEstado } from "@/types";

export type CobroFilter = PagoEstado | "all";

interface FilterPillsProps {
  cobros: CobroDelDia[];
  value: CobroFilter;
  onChange: (filter: CobroFilter) => void;
}

/** Pills de filtrado por estado, con contador */
export function FilterPills({ cobros, value, onChange }: FilterPillsProps) {
  const count = (estado: PagoEstado) => cobros.filter((c) => c.estado === estado).length;

  return (
    <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      <Pill
        active={value === "all"}
        activeClass="bg-primary text-primary-foreground"
        onClick={() => onChange("all")}
      >
        Todos ({cobros.length})
      </Pill>
      {PAGO_ESTADOS.map((estado) => (
        <Pill
          key={estado}
          active={value === estado}
          activeClass={PAGO_ESTADO[estado].pill}
          onClick={() => onChange(estado)}
        >
          {PAGO_ESTADO[estado].short} ({count(estado)})
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap shadow-sm transition-colors",
        active ? activeClass : "border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
