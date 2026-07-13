"use client";

import { useEffect } from "react";
import { FileText, MessageCircle, Minus, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClienteDetalle } from "@/store/slices/clientes.slice";
import { cn } from "@/lib/utils";
import { fmtMoney, formatFecha, whatsappUrl } from "@/lib/format";
import type { ClienteResumen } from "@/types";

interface BalanceDialogProps {
  clienteId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNota: (cliente: { id: number; nombre: string }) => void;
  onCargo: (cliente: ClienteResumen) => void;
  onPago: (cliente: ClienteResumen) => void;
}

/** Balance del cliente: resumen, historial de transacciones y acciones */
export function BalanceDialog({
  clienteId,
  open,
  onOpenChange,
  onNota,
  onCargo,
  onPago,
}: BalanceDialogProps) {
  const dispatch = useAppDispatch();
  const { cliente, transacciones, status } = useAppSelector((s) => s.clientes.detalle);
  const cargando = status === "loading" || cliente?.id !== clienteId;

  useEffect(() => {
    if (open && clienteId) {
      dispatch(fetchClienteDetalle(clienteId));
    }
  }, [open, clienteId, dispatch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Balance del Cliente</DialogTitle>
          <DialogDescription className="sr-only">
            Resumen e historial de transacciones del cliente
          </DialogDescription>
        </DialogHeader>

        {cargando || !cliente ? (
          <BalanceSkeleton />
        ) : (
          <>
            <div className="flex items-center gap-3.5">
              <InitialsAvatar
                nombre={cliente.nombre}
                moroso={cliente.estatus === "Moroso"}
                size="lg"
              />
              <div>
                <div className="font-bold">{cliente.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {cliente.estatus} · Tel: {cliente.telefono || "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <BalanceCard label="Pago Acordado" orange>
                {cliente.pagoAcordado != null ? fmtMoney(cliente.pagoAcordado, cliente.moneda) : "—"}
              </BalanceCard>
              <BalanceCard label="Cobrador">{cliente.cobradorNombre ?? "—"}</BalanceCard>
              <BalanceCard label="Total Cobrado" orange>
                {fmtMoney(cliente.totalCobrado, cliente.moneda)}
              </BalanceCard>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ActionButton
                icon={<Phone />}
                label="Llamar"
                disabled={!cliente.telefono}
                onClick={() => window.open(`tel:${cliente.telefono}`)}
              />
              <ActionButton
                icon={<MessageCircle />}
                label="WhatsApp"
                disabled={!cliente.telefono}
                onClick={() => window.open(whatsappUrl(cliente.telefono), "_blank")}
              />
              <ActionButton
                icon={<FileText />}
                label="Nota"
                onClick={() => onNota({ id: cliente.id, nombre: cliente.nombre })}
              />
            </div>

            <div>
              <div className="mb-2 text-[0.68rem] font-bold tracking-widest text-muted-foreground uppercase">
                Historial de Transacciones
              </div>
              {transacciones.length === 0 ? (
                <EmptyState icon="📭">Sin transacciones aún.</EmptyState>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  {transacciones.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-2.5 border-b py-2 last:border-b-0"
                    >
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          tx.tipo === "PAGO" ? "bg-green-500" : "bg-red-500"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.8rem] font-semibold">{tx.concepto}</div>
                        <div className="text-[0.68rem] text-muted-foreground">
                          {formatFecha(tx.fecha)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "font-mono text-sm font-bold",
                          tx.tipo === "PAGO"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {tx.tipo === "PAGO" ? "+" : "−"}
                        {fmtMoney(tx.monto, cliente.moneda)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <Button
                className="flex-1 bg-gradient-to-br from-red-500 to-red-600 font-bold text-white hover:opacity-90"
                onClick={() => onCargo(cliente)}
              >
                <Plus /> Cargo
              </Button>
              <Button
                className="flex-1 bg-gradient-to-br from-green-500 to-green-600 font-bold text-white hover:opacity-90"
                onClick={() => onPago(cliente)}
              >
                <Minus /> Pago
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BalanceCard({
  label,
  orange,
  children,
}: {
  label: string;
  orange?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2.5 text-center">
      <div className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className={cn("mt-0.5 font-mono text-[0.8rem] font-bold break-words", orange && "text-primary")}>
        {children}
      </div>
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

function BalanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
