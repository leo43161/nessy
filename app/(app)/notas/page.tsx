"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotaCard } from "@/components/notas/nota-card";
import { NotaViewDialog } from "@/components/notas/nota-view-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchNotas } from "@/store/slices/notas.slice";
import type { Nota } from "@/types";

export default function NotasPage() {
  const dispatch = useAppDispatch();
  const usuario = useAppSelector((s) => s.auth.usuario);
  const { items, status, error } = useAppSelector((s) => s.notas);
  const [seleccionada, setSeleccionada] = useState<Nota | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  useEffect(() => {
    if (usuario) {
      dispatch(fetchNotas(usuario.id));
    }
  }, [usuario, dispatch]);

  const cargando = status === "loading" || status === "idle";

  return (
    <>
      {cargando ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : status === "failed" ? (
        <EmptyState icon="⚠️">{error}</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState icon="📝">
          No hay notas aún.
          <br />
          Las notas se crean desde el detalle de cada cobro o cliente.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((nota) => (
            <NotaCard
              key={nota.id}
              nota={nota}
              onClick={() => {
                setSeleccionada(nota);
                setViewOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <NotaViewDialog nota={seleccionada} open={viewOpen} onOpenChange={setViewOpen} />
    </>
  );
}
