"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch } from "@/store/hooks";
import { deleteNota } from "@/store/slices/notas.slice";
import { formatFecha } from "@/lib/format";
import type { Nota } from "@/types";

interface NotaViewDialogProps {
  nota: Nota | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Vista de una nota con opción de eliminarla */
export function NotaViewDialog({ nota, open, onOpenChange }: NotaViewDialogProps) {
  const dispatch = useAppDispatch();
  const [eliminando, setEliminando] = useState(false);

  if (!nota) return null;

  const eliminar = async () => {
    setEliminando(true);
    const result = await dispatch(deleteNota(nota.id));
    setEliminando(false);
    if (deleteNota.fulfilled.match(result)) {
      toast.success("Nota eliminada.");
      onOpenChange(false);
    } else {
      toast.error(result.payload ?? "No se pudo eliminar la nota.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Nota</DialogTitle>
          <DialogDescription className="sr-only">Detalle de la nota</DialogDescription>
        </DialogHeader>

        <div className="text-xs font-semibold text-primary">{nota.clienteNombre}</div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{nota.contenido}</p>
        <div className="text-[0.7rem] text-muted-foreground">{formatFecha(nota.fecha)}</div>

        <DialogFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={eliminando}>
                {eliminando ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta nota?</AlertDialogTitle>
                <AlertDialogDescription>
                  La nota sobre {nota.clienteNombre} se eliminará de forma permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={eliminar}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
