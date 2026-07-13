"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ClienteCard } from "@/components/clientes/cliente-card";
import { ClienteFormDialog } from "@/components/clientes/cliente-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { useClienteFlow } from "@/hooks/use-cliente-flow";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClientes } from "@/store/slices/clientes.slice";

export default function ClientesPage() {
  const dispatch = useAppDispatch();
  const usuario = useAppSelector((s) => s.auth.usuario);
  const { items, status, error } = useAppSelector((s) => s.clientes);

  const [busqueda, setBusqueda] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const { openBalance, dialogs } = useClienteFlow(() => {
    if (usuario) dispatch(fetchClientes(usuario.id));
  });

  useEffect(() => {
    if (usuario) {
      dispatch(fetchClientes(usuario.id));
    }
  }, [usuario, dispatch]);

  const filtrados = items.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );
  const cargando = status === "loading" || status === "idle";

  return (
    <>
      <div className="relative mb-3.5">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar cliente…"
          className="h-10 rounded-xl bg-card pl-9"
        />
      </div>

      {cargando ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-19 rounded-xl" />
          ))}
        </div>
      ) : status === "failed" ? (
        <EmptyState icon="⚠️">{error}</EmptyState>
      ) : filtrados.length === 0 ? (
        <EmptyState icon="👥">
          {busqueda ? "Sin resultados para la búsqueda." : "No hay clientes para este cobrador."}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtrados.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              onClick={() => openBalance(cliente.id)}
            />
          ))}
        </div>
      )}

      {/* FAB: nuevo cliente */}
      <button
        type="button"
        title="Nuevo cliente"
        onClick={() => setFormOpen(true)}
        className="fixed bottom-6 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_6px_20px_rgba(249,115,22,0.45)] transition-transform hover:scale-108 right-4 min-[736px]:right-[calc(50%-350px+16px)]"
      >
        <Plus className="size-6" />
      </button>

      <ClienteFormDialog open={formOpen} onOpenChange={setFormOpen} />
      {dialogs}
    </>
  );
}
