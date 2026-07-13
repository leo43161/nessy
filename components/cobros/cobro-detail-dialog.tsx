"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, MessageCircle, Phone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCobradores } from "@/hooks/use-cobradores";
import { useAppDispatch } from "@/store/hooks";
import { updateCobro } from "@/store/slices/cobros.slice";
import { cn } from "@/lib/utils";
import { fmtMoney, formatFecha, whatsappUrl } from "@/lib/format";
import { COBRO_STATUS, COBRO_STATUSES } from "@/lib/status";
import type { Cliente, CobroDia, CobroStatus } from "@/types";

interface CobroDetailDialogProps {
  cobro: CobroDia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNota: (cliente: Cliente) => void;
  onBalance: (clienteId: number) => void;
}

/** Detalle de un cobro del día: actualizar estado, contactar, nota y balance */
export function CobroDetailDialog({
  cobro,
  open,
  onOpenChange,
  onNota,
  onBalance,
}: CobroDetailDialogProps) {
  if (!cobro) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {/* Montado al abrir: el form arranca con el estado actual del cobro */}
        <CobroDetailForm
          cobro={cobro}
          onOpenChange={onOpenChange}
          onNota={onNota}
          onBalance={onBalance}
        />
      </DialogContent>
    </Dialog>
  );
}

function CobroDetailForm({
  cobro,
  onOpenChange,
  onNota,
  onBalance,
}: {
  cobro: CobroDia;
  onOpenChange: (open: boolean) => void;
  onNota: (cliente: Cliente) => void;
  onBalance: (clienteId: number) => void;
}) {
  const dispatch = useAppDispatch();
  const cobradores = useCobradores();
  const [status, setStatus] = useState<CobroStatus>(cobro.status);
  const [scCobrador, setScCobrador] = useState(String(cobro.scCobradorId ?? 0));
  const [scNotas, setScNotas] = useState(cobro.scNotas ?? "");
  const [guardando, setGuardando] = useState(false);

  const { cliente } = cobro;
  const mensajeDemora = `Hola ${cliente.nombre.split(" ")[0]}! Te recordamos que tenés pendiente la cuota de ${fmtMoney(cobro.monto, cliente.moneda)} (${formatFecha(cobro.fecha)}). ¿Coordinamos el pago?`;

  const guardar = async () => {
    setGuardando(true);
    const result = await dispatch(
      updateCobro({
        id: cobro.id,
        status,
        scCobradorId: status === "Paid" && scCobrador !== "0" ? Number(scCobrador) : null,
        scNotas: status === "Paid" && scNotas.trim() ? scNotas.trim() : null,
      })
    );
    setGuardando(false);
    if (updateCobro.fulfilled.match(result)) {
      toast.success(`Cobro de ${cliente.nombre} actualizado.`);
      onOpenChange(false);
    } else {
      toast.error(result.payload ?? "No se pudo actualizar el cobro.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Detalle de Cobro</DialogTitle>
        <DialogDescription className="sr-only">
          Información y actualización de estado del cobro
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3.5">
        <InitialsAvatar nombre={cliente.nombre} moroso={cliente.estatus === "Moroso"} size="lg" />
        <div>
          <div className="font-bold">{cliente.nombre}</div>
          <div className="text-xs text-muted-foreground">
            {cliente.telefono || "—"} · {cliente.estatus}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <InfoCard label="Monto Esperado">
          <span className="text-primary">{fmtMoney(cobro.monto, cliente.moneda)}</span>
        </InfoCard>
        <InfoCard label="Frecuencia">{cobro.frecuencia}</InfoCard>
        <InfoCard label="Fecha">{formatFecha(cobro.fecha)}</InfoCard>
        <InfoCard label="Estado">
          <StatusBadge status={cobro.status} />
        </InfoCard>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Actualizar Estado
        </div>
        <div className="grid grid-cols-2 gap-2">
          {COBRO_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "cursor-pointer rounded-lg border-2 border-transparent bg-muted px-2 py-2.5 text-xs font-bold text-muted-foreground transition-all hover:-translate-y-px",
                status === s && COBRO_STATUS[s].selected
              )}
            >
              {COBRO_STATUS[s].label}
            </button>
          ))}
        </div>
      </div>

      {status === "Paid" && (
        <div className="space-y-3 rounded-lg bg-muted/50 p-3">
          <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Caso Especial
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-cobrador">Cobrado por otro cobrador</Label>
            <Select value={scCobrador} onValueChange={setScCobrador}>
              <SelectTrigger id="sc-cobrador" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">— Ninguno —</SelectItem>
                {cobradores.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-notas">Notas del caso</Label>
            <Textarea
              id="sc-notas"
              value={scNotas}
              onChange={(e) => setScNotas(e.target.value)}
              placeholder="Ej. Diego cubrió ruta de Marcos…"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <ActionButton
          icon={<Phone />}
          label="Llamar"
          onClick={() => window.open(`tel:${cliente.telefono}`)}
          disabled={!cliente.telefono}
        />
        <ActionButton
          icon={<MessageCircle />}
          label="WhatsApp"
          onClick={() =>
            window.open(
              whatsappUrl(cliente.telefono, status === "Paid" ? undefined : mensajeDemora),
              "_blank"
            )
          }
          disabled={!cliente.telefono}
        />
        <ActionButton icon={<FileText />} label="Nota" onClick={() => onNota(cliente)} />
        <ActionButton icon={<Wallet />} label="Balance" onClick={() => onBalance(cliente.id)} />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <div className="mb-0.5 text-[0.62rem] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-mono text-sm font-bold">{children}</div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg bg-muted px-1.5 py-2.5 text-[0.62rem] font-semibold text-muted-foreground transition-colors hover:bg-orange-100 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-orange-950 dark:hover:text-orange-300 [&_svg]:size-4"
    >
      {icon}
      {label}
    </button>
  );
}
