"use client";

import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLocalidades } from "@/hooks/use-catalogos";

export interface FiltrosState {
  busqueda: string;
  localidadId: string; // "todas" | id
  /** true → ver cobros de todos los cobradores (modo asistencia) */
  todosCobradores: boolean;
}

interface CobrosFiltersProps {
  value: FiltrosState;
  onChange: (value: FiltrosState) => void;
  /** Texto del toggle de asistencia */
  todosLabel?: string;
}

/** Nav de filtros: buscador, localidad y ver todos los cobradores */
export function CobrosFilters({ value, onChange, todosLabel = "Todos los cobradores" }: CobrosFiltersProps) {
  const localidades = useLocalidades();

  return (
    <div className="mb-3.5 flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.busqueda}
          onChange={(e) => onChange({ ...value, busqueda: e.target.value })}
          placeholder="Buscar cliente…"
          className="h-10 rounded-xl bg-card pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={value.localidadId}
          onValueChange={(v) => onChange({ ...value, localidadId: v })}
        >
          <SelectTrigger className="h-9 flex-1 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las localidades</SelectItem>
            {localidades.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => onChange({ ...value, todosCobradores: !value.todosCobradores })}
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
            value.todosCobradores
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
          title="Ver cobros de todos los cobradores para asistir"
        >
          <Users className="size-4" />
          {todosLabel}
        </button>
      </div>
    </div>
  );
}
