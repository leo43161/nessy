"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, Check, Loader2 } from "lucide-react";
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
import { useAppDispatch } from "@/store/hooks";
import { addCargo } from "@/store/slices/clientes.slice";
import { cn } from "@/lib/utils";
import { fmtMoney } from "@/lib/format";
import { FRECUENCIAS } from "@/lib/constants";
import type { ClienteResumen, Frecuencia } from "@/types";

interface CargoDialogProps {
  cliente: ClienteResumen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama después de guardar (para refrescar y volver al balance) */
  onSaved: (cliente: ClienteResumen) => void;
}

/** Carga de nueva financiación (cargo) con esquema de pago o pago contado */
export function CargoDialog({ cliente, open, onOpenChange, onSaved }: CargoDialogProps) {
  if (!cliente) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <CargoForm cliente={cliente} onOpenChange={onOpenChange} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

function CargoForm({
  cliente,
  onOpenChange,
  onSaved,
}: {
  cliente: ClienteResumen;
  onOpenChange: (open: boolean) => void;
  onSaved: (cliente: ClienteResumen) => void;
}) {
  const dispatch = useAppDispatch();
  const [concepto, setConcepto] = useState("");
  const [pagoContado, setPagoContado] = useState(false);
  const [monto, setMonto] = useState("");
  const [anticipo, setAnticipo] = useState("0");
  const [pagoAcordado, setPagoAcordado] = useState("");
  const [esquema, setEsquema] = useState<Frecuencia>("Mensual");
  const [guardando, setGuardando] = useState(false);

  const resumen = useMemo(() => {
    if (pagoContado) return null;
    const nMonto = parseFloat(monto) || 0;
    const nAnticipo = parseFloat(anticipo) || 0;
    const saldo = Math.max(0, nMonto - nAnticipo);
    const pa = parseFloat(pagoAcordado) || saldo;
    if (saldo <= 0 || pa <= 0) return null;
    return { saldo, pa, cuotas: Math.ceil(saldo / pa) };
  }, [pagoContado, monto, anticipo, pagoAcordado]);

  const guardar = async () => {
    const nMonto = parseFloat(monto) || 0;
    if (nMonto <= 0) {
      toast.error("Monto inválido.");
      return;
    }
    setGuardando(true);
    const result = await dispatch(
      addCargo({
        clienteId: cliente.id,
        concepto: concepto.trim() || "Cargo",
        monto: nMonto,
        anticipo: parseFloat(anticipo) || 0,
        pagoContado,
        pagoAcordado: pagoContado ? undefined : resumen?.pa,
        esquema: pagoContado ? undefined : esquema,
      })
    );
    setGuardando(false);
    if (addCargo.fulfilled.match(result)) {
      toast.success("Cargo registrado.");
      onOpenChange(false);
      onSaved(cliente);
    } else {
      toast.error(result.payload ?? "No se pudo registrar el cargo.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">[+] Cargo</DialogTitle>
        <DialogDescription className="text-center font-semibold text-foreground">
          {cliente.nombre}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="cargo-concepto">Concepto</Label>
        <Input
          id="cargo-concepto"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej. Saldo inicial, Mercadería…"
        />
      </div>

      <button
        type="button"
        onClick={() => setPagoContado(!pagoContado)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-2 bg-muted/50 px-3 py-2.5 text-left transition-colors",
          pagoContado ? "border-primary bg-orange-50 dark:bg-orange-950/40" : "border-border"
        )}
      >
        <Banknote className="size-5 text-primary" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Pago Contado</div>
          <div className="text-[0.7rem] text-muted-foreground">
            Se salda al momento, sin cuotas
          </div>
        </div>
        <span
          className={cn(
            "flex size-4.5 items-center justify-center rounded border-2 transition-colors",
            pagoContado
              ? "border-primary bg-primary text-white"
              : "border-muted-foreground/40 bg-background"
          )}
        >
          {pagoContado && <Check className="size-3" />}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="cargo-monto">Monto</Label>
          <Input
            id="cargo-monto"
            type="number"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cargo-anticipo">(–) Anticipo</Label>
          <Input
            id="cargo-anticipo"
            type="number"
            min="0"
            value={anticipo}
            onChange={(e) => setAnticipo(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {!pagoContado && (
        <div className="space-y-2.5">
          <div className="text-[0.68rem] font-bold tracking-widest text-muted-foreground uppercase">
            Esquema de Pago
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="cargo-pa">Pago acordado</Label>
              <Input
                id="cargo-pa"
                type="number"
                min="0"
                value={pagoAcordado}
                onChange={(e) => setPagoAcordado(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cargo-esquema">Esquema</Label>
              <Select value={esquema} onValueChange={(v) => setEsquema(v as Frecuencia)}>
                <SelectTrigger id="cargo-esquema" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRECUENCIAS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {resumen && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3 text-[0.8rem] leading-relaxed dark:border-orange-900 dark:bg-orange-950/40">
          Saldo <strong className="text-primary">{fmtMoney(resumen.saldo, cliente.moneda)}</strong>{" "}
          en <strong className="text-primary">{resumen.cuotas} pago(s)</strong> de{" "}
          <strong className="text-primary">{fmtMoney(resumen.pa, cliente.moneda)}</strong> ·
          Esquema: <strong className="text-primary">{esquema}</strong>
        </div>
      )}

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          Guardar Cargo
        </Button>
      </DialogFooter>
    </>
  );
}
