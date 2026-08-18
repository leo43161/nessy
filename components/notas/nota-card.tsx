"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFecha } from "@/lib/format";
import type { NotaConCliente } from "@/services/notas.service";

interface NotaCardProps {
  nota: NotaConCliente;
  onEdit: () => void;
  onDelete: () => void;
}

export function NotaCard({ nota, onEdit, onDelete }: NotaCardProps) {
  return (
    <div className="rounded-xl border border-l-4 border-l-acento bg-card px-4 py-3.5 shadow-sm">
      <div className="mb-1 text-xs font-semibold text-primary">{nota.clienteNombre}</div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{nota.nota}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[0.7rem] text-muted-foreground">
          {formatFecha(nota.fechaDeCreacion)}
          {nota.fechaUltimaEdicion && " · editada"}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-xs" onClick={onEdit} aria-label="Editar nota">
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onDelete} aria-label="Eliminar nota">
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}
