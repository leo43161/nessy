"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Phone, ReceiptText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { EstadoCuentaDialog } from "@/components/clientes/estado-cuenta-dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registrarPago } from "@/store/slices/cobros.slice";
import { cn } from "@/lib/utils";
import { fmtMoney, formatFecha } from "@/lib/format";
import { esCobrado, esVencido, ESTADOS_REGISTRABLES, PAGO_ESTADO } from "@/lib/status";
import type { CobroDelDia, PagoEstado } from "@/types";

interface RegistroDialogProps {
  cobro: CobroDelDia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerCliente: (clienteId: number) => void;
}

/** Registro de cobro con un click (pagado / adelanto / recargo / incomunicado) */
export function RegistroDialog({ cobro, open, onOpenChange, onVerCliente }: RegistroDialogProps) {
  const dispatch = useAppDispatch();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const [registrando, setRegistrando] = useState<PagoEstado | null>(null);
  const [estadoCuentaOpen, setEstadoCuentaOpen] = useState(false);

  if (!cobro || !cobrador) return null;

  const { cliente } = cobro;
  const vencido = esVencido(cobro.estado, cobro.fechaAcordada, workDate ?? "");
  // Asistencia: el cobrador logueado no es el asignado → se marcará fuera de rango
  const asistiendo = cobrador.id !== cobro.cobradorAsignadoId;
  const mensajeDemora = `Hola ${cliente.nombreCompleto.split(" ")[0]}! Te recordamos la cuota pendiente de ${fmtMoney(cobro.montoEsperado)} (${formatFecha(cobro.fechaAcordada)}). ¿Coordinamos el pago?`;

  const registrar = async (estado: Exclude<PagoEstado, "Pendiente">) => {
    setRegistrando(estado);
    const result = await dispatch(
      registrarPago({ pagoId: cobro.id, estado, cobradorId: cobrador.id })
    );
    setRegistrando(null);
    if (registrarPago.fulfilled.match(result)) {
      toast.success(`${cliente.nombreCompleto}: ${PAGO_ESTADO[estado].label}`);
      // Tras cobrar, ofrecer enviar el estado de cuenta al cliente
      if (esCobrado(estado)) {
        setEstadoCuentaOpen(true);
      } else {
        onOpenChange(false);
      }
    } else {
      toast.error(result.payload ?? "No se pudo registrar el pago.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Registrar Cobro</DialogTitle>
            <DialogDescription className="sr-only">
              Registrar el estado del cobro con un click
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3.5">
            <InitialsAvatar
              nombre={cliente.nombreCompleto}
              moroso={cliente.status === "Moroso"}
              size="lg"
            />
            <div className="min-w-0">
              <div className="truncate font-bold">{cliente.nombreCompleto}</div>
              <div className="text-xs text-muted-foreground">
                {cliente.ubicacionCobro ?? cliente.direccion ?? "—"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Monto Esperado">
              <span className="text-primary">{fmtMoney(cobro.montoEsperado)}</span>
            </InfoCard>
            <InfoCard label="Plan">{cobro.planNombre}</InfoCard>
            <InfoCard label="Fecha">{formatFecha(cobro.fechaAcordada)}</InfoCard>
            <InfoCard label="Estado">
              <StatusBadge estado={cobro.estado} vencido={vencido} />
            </InfoCard>
          </div>

          {asistiendo && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Estás asistiendo a <strong>{cobro.cobradorAsignadoNombre}</strong>. Este cobro se
                registrará <strong>fuera de rango</strong> y el admin lo verá como asistencia.
              </span>
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Registrar con un click
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS_REGISTRABLES.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  disabled={registrando != null}
                  onClick={() => registrar(estado)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-3 text-sm font-bold transition-all hover:-translate-y-px disabled:opacity-50",
                    PAGO_ESTADO[estado].selected,
                    cobro.estado === estado && "ring-2 ring-offset-1 ring-offset-background"
                  )}
                >
                  {registrando === estado ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    PAGO_ESTADO[estado].label
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              icon={<Phone />}
              label="Llamar"
              disabled={cliente.telefonos.length === 0}
              onClick={() => cliente.telefonos[0] && window.open(`tel:${cliente.telefonos[0].numero}`)}
            />
            <WhatsappButton telefonos={cliente.telefonos} mensaje={mensajeDemora}>
              <ActionShell icon={<Phone />} label="WhatsApp" disabled={cliente.telefonos.length === 0} />
            </WhatsappButton>
            <ActionButton
              icon={<User />}
              label="Ver cliente"
              onClick={() => {
                onOpenChange(false);
                onVerCliente(cliente.id);
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setEstadoCuentaOpen(true)}>
              <ReceiptText />
              Estado de cuenta
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EstadoCuentaDialog
        clienteId={cliente.id}
        telefonos={cliente.telefonos}
        cliente={{
          nombreCompleto: cliente.nombreCompleto,
          dni: cliente.dni,
          direccion: cliente.direccion,
          localidadNombre: cliente.localidadNombre,
        }}
        open={estadoCuentaOpen}
        onOpenChange={(o) => {
          setEstadoCuentaOpen(o);
          // Al cerrar el estado de cuenta después de cobrar, cerramos el registro
          if (!o) onOpenChange(false);
        }}
      />
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

function ActionShell({
  icon,
  label,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span
      aria-disabled={disabled}
      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg bg-muted px-1.5 py-2.5 text-[0.62rem] font-semibold text-muted-foreground transition-colors hover:bg-orange-100 hover:text-orange-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 dark:hover:bg-orange-950 dark:hover:text-orange-300 [&_svg]:size-4"
    >
      {icon}
      {label}
    </span>
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
    <button type="button" onClick={onClick} disabled={disabled} className="contents">
      <ActionShell icon={icon} label={label} disabled={disabled} />
    </button>
  );
}
