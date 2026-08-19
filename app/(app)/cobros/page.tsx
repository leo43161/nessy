"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCheck, ListFilter, Users, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CobroCard } from "@/components/cobros/cobro-card";
import { CobrosFilters, type FiltrosState } from "@/components/cobros/cobros-filters";
import { CobrosSummary } from "@/components/cobros/cobros-summary";
import { DateHeader } from "@/components/cobros/date-header";
import { FilterPills, type CobroFilter } from "@/components/cobros/filter-pills";
import { RankingBanner } from "@/components/cobros/ranking-banner";
import { RegistroDialog } from "@/components/cobros/registro-dialog";
import { WorkDateDialog } from "@/components/cobros/work-date-dialog";
import { AccionesFab } from "@/components/shared/acciones-fab";
import { ClienteDetailDialog } from "@/components/clientes/cliente-detail-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCobros } from "@/store/slices/cobros.slice";
import { fetchEstadisticas } from "@/store/slices/estadisticas.slice";
import { formatFecha, todayISO } from "@/lib/format";
import type { CobroDelDia } from "@/types";

export default function CobrosPage() {
  const dispatch = useAppDispatch();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const { items, status, error } = useAppSelector((s) => s.cobros);
  const stats = useAppSelector((s) => s.estadisticas.data);

  const [filtros, setFiltros] = useState<FiltrosState>({
    busqueda: "",
    localidadId: "todas",
    todosCobradores: false,
  });
  const [estadoFilter, setEstadoFilter] = useState<CobroFilter>("all");
  const [seleccionado, setSeleccionado] = useState<CobroDelDia | null>(null);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteOpen, setClienteOpen] = useState(false);
  const [fechaOpen, setFechaOpen] = useState(false);

  // Carga de cobros según filtros de servidor (cobrador/localidad/fecha)
  useEffect(() => {
    if (!cobrador || !workDate) return;
    dispatch(
      fetchCobros({
        fecha: workDate,
        cobradorId: filtros.todosCobradores ? null : cobrador.id,
        localidadId: filtros.localidadId === "todas" ? null : Number(filtros.localidadId),
      })
    );
  }, [cobrador, workDate, filtros.todosCobradores, filtros.localidadId, dispatch]);

  // Ranking / desempeño para el banner
  useEffect(() => {
    if (cobrador && workDate) {
      dispatch(fetchEstadisticas({ cobradorId: cobrador.id, fecha: workDate }));
    }
  }, [cobrador, workDate, items, dispatch]);

  // El cobro abierto refleja la versión actualizada del store
  const cobroActual = seleccionado
    ? (items.find((c) => c.id === seleccionado.id) ?? seleccionado)
    : null;

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return items
      .filter((c) => (estadoFilter === "all" ? true : c.estado === estadoFilter))
      .filter((c) => (q ? c.cliente.nombreCompleto.toLowerCase().includes(q) : true));
  }, [items, estadoFilter, filtros.busqueda]);

  const cargando = status === "loading" || status === "idle";
  const hoy = workDate ?? todayISO();

  return (
    <>
      <DateHeader />
      <RankingBanner stats={stats} />
      <CobrosSummary cobros={items} />
      <CobrosFilters value={filtros} onChange={setFiltros} />
      <FilterPills cobros={items} value={estadoFilter} onChange={setEstadoFilter} />

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
          No hay cobros para mostrar.
          <br />
          Probá con otra fecha o filtro.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((cobro) => (
            <CobroCard
              key={cobro.id}
              cobro={cobro}
              hoy={hoy}
              mostrarCobrador={filtros.todosCobradores}
              onClick={() => {
                setSeleccionado(cobro);
                setRegistroOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Las mismas cosas que ya se pueden hacer con los controles de arriba,
          juntas en un lugar fijo y con el nombre completo. El porqué está en
          components/shared/acciones-fab.tsx. */}
      <AccionesFab
        acciones={[
          {
            label: "Ver los que faltan cobrar",
            descripcion: "Solo las cuotas todavía pendientes",
            icon: <Wallet />,
            onSelect: () => setEstadoFilter("Pendiente"),
            disabled: estadoFilter === "Pendiente",
          },
          {
            label: "Ver los ya cobrados",
            descripcion: "Lo que entró en este día",
            icon: <CheckCheck />,
            onSelect: () => setEstadoFilter("Pagado"),
            disabled: estadoFilter === "Pagado",
          },
          {
            label: "Ver todos los cobros del día",
            descripcion: "Saca el filtro y muestra la lista completa",
            icon: <ListFilter />,
            onSelect: () => setEstadoFilter("all"),
            disabled: estadoFilter === "all",
          },
          {
            label: "Cambiar el día de trabajo",
            descripcion: "Estás viendo el " + formatFecha(hoy),
            icon: <CalendarDays />,
            onSelect: () => setFechaOpen(true),
            separar: true,
          },
          {
            label: filtros.todosCobradores ? "Ver solo mis cobros" : "Ver los cobros de todos",
            descripcion: filtros.todosCobradores
              ? "Volver a tu cartera"
              : "Para salir a cobrar por un compañero",
            icon: <Users />,
            onSelect: () => setFiltros({ ...filtros, todosCobradores: !filtros.todosCobradores }),
          },
        ]}
      />

      <WorkDateDialog open={fechaOpen} onOpenChange={setFechaOpen} />

      <RegistroDialog
        cobro={cobroActual}
        open={registroOpen}
        onOpenChange={setRegistroOpen}
        onVerCliente={(id) => {
          setClienteId(id);
          setClienteOpen(true);
        }}
      />
      <ClienteDetailDialog clienteId={clienteId} open={clienteOpen} onOpenChange={setClienteOpen} />
    </>
  );
}
