"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch } from "@/store/hooks";
import { createNota, editNota } from "@/store/slices/notas.slice";

export interface NotaFormTarget {
  clienteId: number;
  clienteNombre: string;
  /** Presente si se está editando una nota existente */
  notaId?: number;
  contenidoInicial?: string;
}

interface NotaFormDialogProps {
  target: NotaFormTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

/** Alta o edición de una nota de cliente */
export function NotaFormDialog({ target, open, onOpenChange, onSaved }: NotaFormDialogProps) {
  if (!target) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <NotaForm target={target} onOpenChange={onOpenChange} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function NotaForm({
  target,
  onOpenChange,
  onSaved,
}: {
  target: NotaFormTarget;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const dispatch = useAppDispatch();
  const [contenido, setContenido] = useState(target.contenidoInicial ?? "");
  const [guardando, setGuardando] = useState(false);
  const editando = target.notaId != null;

  const guardar = async () => {
    if (!contenido.trim()) {
      toast.error("La nota no puede estar vacía.");
      return;
    }
    setGuardando(true);
    const result = editando
      ? await dispatch(editNota({ notaId: target.notaId!, contenido: contenido.trim() }))
      : await dispatch(createNota({ clienteId: target.clienteId, contenido: contenido.trim() }));
    setGuardando(false);
    const ok = editando ? editNota.fulfilled.match(result) : createNota.fulfilled.match(result);
    if (ok) {
      toast.success(editando ? "Nota actualizada." : "Nota guardada.");
      onSaved?.();
      onOpenChange(false);
    } else {
      toast.error("No se pudo guardar la nota.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">{editando ? "Editar Nota" : "Nueva Nota"}</DialogTitle>
        <DialogDescription className="text-center font-semibold text-foreground">
          {target.clienteNombre}
        </DialogDescription>
      </DialogHeader>
      <Textarea
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder="Escribí tu nota aquí…"
        className="min-h-28"
        autoFocus
      />
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando || !contenido.trim()}>
          {guardando && <Loader2 className="animate-spin" />}
          {editando ? "Guardar cambios" : "Guardar Nota"}
        </Button>
      </DialogFooter>
    </>
  );
}
