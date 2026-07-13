"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CobroCard } from "@/components/cobros/cobro-card";
import { CobroDetailDialog } from "@/components/cobros/cobro-detail-dialog";
import { CobrosSummary } from "@/components/cobros/cobros-summary";
import { DateHeader } from "@/components/cobros/date-header";
import { FilterPills, type CobroFilter } from "@/components/cobros/filter-pills";
import { EmptyState } from "@/components/shared/empty-state";
import { useClienteFlow } from "@/hooks/use-cliente-flow";
import { useCobradores } from "@/hooks/use-cobradores";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCobros } from "@/store/slices/cobros.slice";
import type { CobroDia } from "@/types";

export default function CobrosPage() {
  const dispatch = useAppDispatch();
  const usuario = useAppSelector((s) => s.auth.usuario);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const { items, status, error } = useAppSelector((s) => s.cobros);
  const cobradores = useCobradores();

  const [filtro, setFiltro] = useState<CobroFilter>("all");
  const [seleccionado, setSeleccionado] = useState<CobroDia | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const { openBalance, openNota, dialogs } = useClienteFlow();

  useEffect(() => {
    if (usuario && workDate) {
      dispatch(fetchCobros({ cobradorId: usuario.id, fecha: workDate }));
    }
  }, [usuario, workDate, dispatch]);

  // El detalle abierto debe reflejar la versión actualizada del store
  const cobroActual = seleccionado
    ? (items.find((c) => c.id === seleccionado.id) ?? seleccionado)
    : null;

  const filtrados = filtro === "all" ? items : items.filter((c) => c.status === filtro);
  const cargando = status === "loading" || status === "idle";

  return (
    <>
      <DateHeader />
      <CobrosSummary cobros={items} />
      <FilterPills cobros={items} value={filtro} onChange={setFiltro} />

      {cargando ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-17 rounded-xl" />
          ))}
        </div>
      ) : status === "failed" ? (
        <EmptyState icon="⚠️">{error}</EmptyState>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="📭">
          No hay cobros para este día.
          <br />
          Probá con otra fecha.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((cobro) => (
            <CobroCard
              key={cobro.id}
              cobro={cobro}
              cobradores={cobradores}
              onClick={() => {
                setSeleccionado(cobro);
                setDetalleOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <CobroDetailDialog
        cobro={cobroActual}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
        onNota={(cliente) => openNota({ id: cliente.id, nombre: cliente.nombre })}
        onBalance={(clienteId) => {
          setDetalleOpen(false);
          openBalance(clienteId);
        }}
      />
      {dialogs}
    </>
  );
}
