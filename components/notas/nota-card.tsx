"use client";

import { formatFecha } from "@/lib/format";
import type { Nota } from "@/types";

interface NotaCardProps {
  nota: Nota;
  onClick: () => void;
}

export function NotaCard({ nota, onClick }: NotaCardProps) {
  const resumen =
    nota.contenido.length > 120 ? `${nota.contenido.slice(0, 120)}…` : nota.contenido;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-xl border border-l-4 border-l-orange-300 bg-card px-4 py-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-l-orange-700"
    >
      <div className="mb-1 text-xs font-semibold text-primary">{nota.clienteNombre}</div>
      <div className="text-sm leading-relaxed text-muted-foreground">{resumen}</div>
      <div className="mt-1.5 text-[0.7rem] text-muted-foreground/70">{formatFecha(nota.fecha)}</div>
    </button>
  );
}
