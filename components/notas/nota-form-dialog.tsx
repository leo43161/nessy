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
import { createNota } from "@/store/slices/notas.slice";

interface ClienteRef {
  id: number;
  nombre: string;
}

interface NotaFormDialogProps {
  cliente: ClienteRef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Alta de nota sobre un cliente (se abre desde cobros, clientes o balance) */
export function NotaFormDialog({ cliente, open, onOpenChange }: NotaFormDialogProps) {
  if (!cliente) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Montado al abrir: siempre arranca vacío */}
        <NotaForm cliente={cliente} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function NotaForm({
  cliente,
  onOpenChange,
}: {
  cliente: ClienteRef;
  onOpenChange: (open: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const [contenido, setContenido] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!contenido.trim()) {
      toast.error("La nota no puede estar vacía.");
      return;
    }
    setGuardando(true);
    const result = await dispatch(createNota({ clienteId: cliente.id, contenido: contenido.trim() }));
    setGuardando(false);
    if (createNota.fulfilled.match(result)) {
      toast.success("Nota guardada.");
      onOpenChange(false);
    } else {
      toast.error(result.payload ?? "No se pudo guardar la nota.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Nueva Nota</DialogTitle>
        <DialogDescription className="text-center font-semibold text-foreground">
          {cliente.nombre}
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
          Guardar Nota
        </Button>
      </DialogFooter>
    </>
  );
}
