"use client";

import { cn } from "@/lib/utils";
import { COBRO_STATUS, COBRO_STATUSES } from "@/lib/status";
import type { CobroDia, CobroStatus } from "@/types";

export type CobroFilter = CobroStatus | "all";

interface FilterPillsProps {
  cobros: CobroDia[];
  value: CobroFilter;
  onChange: (filter: CobroFilter) => void;
}

/** Pills de filtrado por estado, con contador */
export function FilterPills({ cobros, value, onChange }: FilterPillsProps) {
  const count = (status: CobroStatus) => cobros.filter((c) => c.status === status).length;

  return (
    <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      <Pill active={value === "all"} activeClass="bg-primary text-primary-foreground" onClick={() => onChange("all")}>
        Todos ({cobros.length})
      </Pill>
      {COBRO_STATUSES.map((status) => (
        <Pill
          key={status}
          active={value === status}
          activeClass={COBRO_STATUS[status].pill}
          onClick={() => onChange(status)}
        >
          {COBRO_STATUS[status].short} ({count(status)})
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
