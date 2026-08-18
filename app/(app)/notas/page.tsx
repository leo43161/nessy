"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { NotaCard } from "@/components/notas/nota-card";
import { NotaFormDialog, type NotaFormTarget } from "@/components/notas/nota-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AccionesFab } from "@/components/shared/acciones-fab";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteNota, fetchNotas } from "@/store/slices/notas.slice";
import type { NotaConCliente } from "@/services/notas.service";

export default function NotasPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const { items, status, error } = useAppSelector((s) => s.notas);

  const [notaTarget, setNotaTarget] = useState<NotaFormTarget | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [aEliminar, setAEliminar] = useState<NotaConCliente | null>(null);

  useEffect(() => {
    if (cobrador) {
      dispatch(fetchNotas(cobrador.id));
    }
  }, [cobrador, dispatch]);

  const editar = (nota: NotaConCliente) => {
    setNotaTarget({
      clienteId: nota.idCliente,
      clienteNombre: nota.clienteNombre,
      notaId: nota.id,
      contenidoInicial: nota.nota,
    });
    setFormOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    const result = await dispatch(deleteNota(aEliminar.id));
    setAEliminar(null);
    if (deleteNota.fulfilled.match(result)) {
      toast.success("Nota eliminada.");
    } else {
      toast.error("No se pudo eliminar la nota.");
    }
  };

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
          Las notas se crean desde el detalle de cada cliente.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((nota) => (
            <NotaCard
              key={nota.id}
              nota={nota}
              onEdit={() => editar(nota)}
              onDelete={() => setAEliminar(nota)}
            />
          ))}
        </div>
      )}

      {/* Las notas nacen desde la ficha del cliente, no desde acá: cuelgan de
          un cliente. Por eso el atajo lleva a la lista de clientes en vez de
          abrir un formulario que no sabría de quién es la nota. */}
      <AccionesFab
        acciones={[
          {
            label: "Escribir una nota nueva",
            descripcion: "Te lleva a elegir de qué cliente es",
            icon: <NotebookPen />,
            onSelect: () => router.push("/clientes"),
          },
          {
            label: "Actualizar la lista",
            descripcion: "Vuelve a traer las notas del servidor",
            icon: <RefreshCw />,
            onSelect: () => cobrador && dispatch(fetchNotas(cobrador.id)),
            disabled: !cobrador,
            separar: true,
          },
        ]}
      />

      <NotaFormDialog
        target={notaTarget}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => cobrador && dispatch(fetchNotas(cobrador.id))}
      />

      <AlertDialog open={aEliminar != null} onOpenChange={(o) => !o && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              La nota sobre {aEliminar?.clienteNombre} se eliminará de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarEliminar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
