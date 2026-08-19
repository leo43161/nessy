"use client";

import { useEffect, useMemo, useState } from "react";
import { Eraser, MapPin, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClienteCard } from "@/components/clientes/cliente-card";
import { ClienteDetailDialog } from "@/components/clientes/cliente-detail-dialog";
import { CobrosFilters, type FiltrosState } from "@/components/cobros/cobros-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { AccionesFab } from "@/components/shared/acciones-fab";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClientes } from "@/store/slices/clientes.slice";

export default function ClientesPage() {
  const dispatch = useAppDispatch();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const { items, status, error } = useAppSelector((s) => s.clientes);

  const [filtros, setFiltros] = useState<FiltrosState>({
    busqueda: "",
    localidadId: "todas",
    todosCobradores: false,
  });
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  useEffect(() => {
    if (!cobrador) return;
    dispatch(
      fetchClientes({
        cobradorId: filtros.todosCobradores ? null : cobrador.id,
        localidadId: filtros.localidadId === "todas" ? null : Number(filtros.localidadId),
      })
    );
  }, [cobrador, filtros.todosCobradores, filtros.localidadId, dispatch]);

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) => c.nombreCompleto.toLowerCase().includes(q) || c.dni.includes(q)
    );
  }, [items, filtros.busqueda]);

  const cargando = status === "loading" || status === "idle";

  return (
    <>
      <CobrosFilters value={filtros} onChange={setFiltros} todosLabel="Todos los clientes" />

      {cargando ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-19 rounded-xl" />
          ))}
        </div>
      ) : status === "failed" ? (
        <EmptyState icon="⚠️">{error}</EmptyState>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="👥">
          {filtros.busqueda ? "Sin resultados para la búsqueda." : "No hay clientes para mostrar."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              mostrarCobrador={filtros.todosCobradores}
              onClick={() => {
                setClienteId(cliente.id);
                setDetalleOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <AccionesFab
        acciones={[
          {
            label: filtros.todosCobradores ? "Ver solo mis clientes" : "Ver todos los clientes",
            descripcion: filtros.todosCobradores
              ? "Volver a tu cartera"
              : "Incluye los de los demás cobradores",
            icon: <Users />,
            onSelect: () => setFiltros({ ...filtros, todosCobradores: !filtros.todosCobradores }),
          },
          {
            label: "Ver todas las localidades",
            descripcion: "Saca el filtro de zona",
            icon: <MapPin />,
            onSelect: () => setFiltros({ ...filtros, localidadId: "todas" }),
            disabled: filtros.localidadId === "todas",
          },
          {
            label: "Limpiar la búsqueda",
            descripcion: "Vuelve a mostrar la lista completa",
            icon: <Eraser />,
            onSelect: () => setFiltros({ ...filtros, busqueda: "" }),
            disabled: filtros.busqueda === "",
            separar: true,
          },
        ]}
      />

      <ClienteDetailDialog clienteId={clienteId} open={detalleOpen} onOpenChange={setDetalleOpen} />
    </>
  );
}
