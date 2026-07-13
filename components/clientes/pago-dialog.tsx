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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/store/hooks";
import { addPago } from "@/store/slices/clientes.slice";
import { fmtMoney } from "@/lib/format";
import type { ClienteResumen } from "@/types";

interface PagoDialogProps {
  cliente: ClienteResumen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (cliente: ClienteResumen) => void;
}

/** Registro de un pago manual del cliente */
export function PagoDialog({ cliente, open, onOpenChange, onSaved }: PagoDialogProps) {
  if (!cliente) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <PagoForm cliente={cliente} onOpenChange={onOpenChange} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function PagoForm({
  cliente,
  onOpenChange,
  onSaved,
}: {
  cliente: ClienteResumen;
  onOpenChange: (open: boolean) => void;
  onSaved: (cliente: ClienteResumen) => void;
}) {
  const dispatch = useAppDispatch();
  const [concepto, setConcepto] = useState("Pago en efectivo");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const nMonto = parseFloat(monto) || 0;

  const guardar = async () => {
    if (nMonto <= 0) {
      toast.error("Monto inválido.");
      return;
    }
    setGuardando(true);
    const result = await dispatch(
      addPago({ clienteId: cliente.id, concepto: concepto.trim() || "Pago", monto: nMonto })
    );
    setGuardando(false);
    if (addPago.fulfilled.match(result)) {
      toast.success("Pago registrado.");
      onOpenChange(false);
      onSaved(cliente);
    } else {
      toast.error(result.payload ?? "No se pudo registrar el pago.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">[–] Pago</DialogTitle>
        <DialogDescription className="text-center font-semibold text-foreground">
          {cliente.nombre}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="pago-concepto">Concepto del Pago</Label>
        <Input
          id="pago-concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej. Pago en efectivo…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pago-monto">Monto pagado</Label>
        <Input
          id="pago-monto"
          type="number"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {nMonto > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3 text-[0.8rem] dark:border-orange-900 dark:bg-orange-950/40">
          Registrar pago de{" "}
          <strong className="text-primary">{fmtMoney(nMonto, cliente.moneda)}</strong>.
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando || nMonto <= 0}>
          {guardando && <Loader2 className="animate-spin" />}
          Registrar Pago
        </Button>
      </DialogFooter>
    </>
  );
}
