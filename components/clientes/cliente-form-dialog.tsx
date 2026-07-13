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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCobradores } from "@/hooks/use-cobradores";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createCliente } from "@/store/slices/clientes.slice";
import { CLIENTE_ESTATUS, MONEDAS } from "@/lib/constants";
import type { ClienteEstatus, Moneda } from "@/types";

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Alta de un nuevo cliente */
export function ClienteFormDialog({ open, onOpenChange }: ClienteFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <ClienteForm onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function ClienteForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const dispatch = useAppDispatch();
  const usuario = useAppSelector((s) => s.auth.usuario);
  const cobradores = useCobradores();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("ARP");
  const [estatus, setEstatus] = useState<ClienteEstatus>("Activo");
  const [cobradorId, setCobradorId] = useState(String(usuario?.id ?? ""));
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es requerido.");
      return;
    }
    setGuardando(true);
    const result = await dispatch(
      createCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        moneda,
        estatus,
        cobradorId: Number(cobradorId) || usuario?.id || 0,
      })
    );
    setGuardando(false);
    if (createCliente.fulfilled.match(result)) {
      toast.success(`Cliente ${nombre.trim()} creado.`);
      onOpenChange(false);
    } else {
      toast.error(result.payload ?? "No se pudo guardar el cliente.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Nuevo Cliente</DialogTitle>
        <DialogDescription className="sr-only">Alta de cliente</DialogDescription>
      </DialogHeader>

      <div className="space-y-3 rounded-lg bg-muted/50 p-3">
        <div className="text-[0.68rem] font-bold tracking-widest text-muted-foreground uppercase">
          Información Básica
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-nombre">Nombre *</Label>
          <Input
            id="c-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo del cliente"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="c-telefono">Móvil / Tel</Label>
            <Input
              id="c-telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="381-000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-moneda">Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <SelectTrigger id="c-moneda" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONEDAS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === "ARP" ? "ARP – Peso Arg." : "USD – Dólar"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="c-estatus">Estatus</Label>
            <Select value={estatus} onValueChange={(v) => setEstatus(v as ClienteEstatus)}>
              <SelectTrigger id="c-estatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENTE_ESTATUS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-cobrador">Cobrador asignado</Label>
            <Select value={cobradorId} onValueChange={setCobradorId}>
              <SelectTrigger id="c-cobrador" className="w-full">
                <SelectValue placeholder="Elegir…" />
              </SelectTrigger>
              <SelectContent>
                {cobradores.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando || !nombre.trim()}>
          {guardando && <Loader2 className="animate-spin" />}
          Guardar Cliente
        </Button>
      </DialogFooter>
    </>
  );
}
