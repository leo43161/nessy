"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  MapPin,
  MapPinned,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { EmptyState } from "@/components/shared/empty-state";
import { EstadoCuentaPanel } from "@/components/clientes/estado-cuenta-panel";
import { ReferentesDialog } from "@/components/clientes/referentes-dialog";
import { NotaFormDialog, type NotaFormTarget } from "@/components/notas/nota-form-dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClienteDetalle } from "@/store/slices/clientes.slice";
import { deleteNota } from "@/store/slices/notas.slice";
import { formatFecha, mapaUrl } from "@/lib/format";
import type { Nota } from "@/types";

interface ClienteDetailDialogProps {
  clienteId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Modal completo de un cliente: datos, estado de cuenta, referentes, notas */
export function ClienteDetailDialog({ clienteId, open, onOpenChange }: ClienteDetailDialogProps) {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((s) => s.clientes.detalle);
  const cargando = status === "loading" || data?.cliente.id !== clienteId;

  const [referentesOpen, setReferentesOpen] = useState(false);
  const [notaTarget, setNotaTarget] = useState<NotaFormTarget | null>(null);
  const [notaOpen, setNotaOpen] = useState(false);
  const [notaAEliminar, setNotaAEliminar] = useState<Nota | null>(null);

  useEffect(() => {
    if (open && clienteId != null) {
      dispatch(fetchClienteDetalle(clienteId));
    }
  }, [open, clienteId, dispatch]);

  const refetch = () => {
    if (clienteId != null) dispatch(fetchClienteDetalle(clienteId));
  };

  const abrirNuevaNota = () => {
    if (!data) return;
    setNotaTarget({ clienteId: data.cliente.id, clienteNombre: data.cliente.nombreCompleto });
    setNotaOpen(true);
  };

  const abrirEditarNota = (nota: Nota) => {
    if (!data) return;
    setNotaTarget({
      clienteId: data.cliente.id,
      clienteNombre: data.cliente.nombreCompleto,
      notaId: nota.id,
      contenidoInicial: nota.nota,
    });
    setNotaOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!notaAEliminar) return;
    const result = await dispatch(deleteNota(notaAEliminar.id));
    setNotaAEliminar(null);
    if (deleteNota.fulfilled.match(result)) {
      toast.success("Nota eliminada.");
      refetch();
    } else {
      toast.error("No se pudo eliminar la nota.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Cliente</DialogTitle>
            <DialogDescription className="sr-only">Detalle del cliente</DialogDescription>
          </DialogHeader>

          {cargando || !data ? (
            <ClienteSkeleton />
          ) : (
            <>
              <div className="flex items-center gap-3.5">
                <InitialsAvatar
                  nombre={data.cliente.nombreCompleto}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="font-bold">{data.cliente.nombreCompleto}</div>
                  <div className="text-xs text-muted-foreground">
                    DNI {data.cliente.dni} · {data.cliente.status}
                  </div>
                </div>
              </div>

              {/* Datos personales */}
              <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-[0.8rem]">
                <DatoRow icon={<MapPin className="size-3.5" />} valor={data.cliente.direccion} />
                {data.cliente.ubicacionCobro &&
                  (mapaUrl(data.cliente.ubicacionCobro) ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPinned className="size-3.5 shrink-0" />
                      <a
                        href={mapaUrl(data.cliente.ubicacionCobro)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline underline-offset-2"
                      >
                        Punto de cobro en el mapa
                      </a>
                    </div>
                  ) : (
                    <DatoRow
                      icon={<ReceiptText className="size-3.5" />}
                      valor={data.cliente.ubicacionCobro}
                    />
                  ))}
                <DatoRow
                  icon={<MapPin className="size-3.5" />}
                  valor={data.localidadNombre ? `Localidad: ${data.localidadNombre}` : null}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.telefonos.map((t) => (
                    <a
                      key={t.id}
                      href={`tel:${t.numero}`}
                      className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-1 text-[0.7rem] font-medium hover:bg-muted"
                    >
                      <Phone className="size-3" />
                      {t.numero}
                    </a>
                  ))}
                </div>
                {data.cobradorAsignadoNombre && (
                  <div className="pt-1 text-[0.7rem] text-muted-foreground">
                    Cobrador asignado: {data.cobradorAsignadoNombre}
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="grid grid-cols-3 gap-2">
                <WhatsappButton telefonos={data.telefonos}>
                  <ActionButtonShell icon={<Phone />} label="WhatsApp" disabled={data.telefonos.length === 0} />
                </WhatsappButton>
                <ActionButton
                  icon={<Users />}
                  label={`Referentes${data.referentes.length ? ` (${data.referentes.length})` : ""}`}
                  onClick={() => setReferentesOpen(true)}
                />
                <ActionButton icon={<Plus />} label="Nota" onClick={abrirNuevaNota} />
              </div>

              {/* Estado de cuenta: los planes con su saldo, embebidos. Ya viene
                  en el detalle (/estado_cuenta), así que no cuesta un request. */}
              <div>
                <div className="mb-2 text-[0.68rem] font-bold tracking-widest text-muted-foreground uppercase">
                  Estado de cuenta
                </div>
                {data.estadoDeCuenta.planes.length === 0 ? (
                  <EmptyState icon={<ReceiptText />}>Sin planes de pago.</EmptyState>
                ) : (
                  <EstadoCuentaPanel
                    data={data.estadoDeCuenta}
                    cliente={{
                      nombreCompleto: data.cliente.nombreCompleto,
                      dni: data.cliente.dni,
                      direccion: data.cliente.direccion,
                      localidadNombre: data.localidadNombre,
                    }}
                    telefonos={data.telefonos}
                    referentes={data.referentes}
                  />
                )}
              </div>

              {/* Notas */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[0.68rem] font-bold tracking-widest text-muted-foreground uppercase">
                    Notas
                  </span>
                  <Button variant="ghost" size="xs" onClick={abrirNuevaNota}>
                    <Plus /> Nueva
                  </Button>
                </div>
                {data.notas.length === 0 ? (
                  <EmptyState icon={<FileText />}>Sin notas para este cliente.</EmptyState>
                ) : (
                  <div className="space-y-2">
                    {data.notas.map((nota) => (
                      <div key={nota.id} className="rounded-lg border bg-card p-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{nota.nota}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[0.68rem] text-muted-foreground">
                            {formatFecha(nota.fechaDeCreacion)}
                            {nota.fechaUltimaEdicion && " · editada"}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon-xs" onClick={() => abrirEditarNota(nota)}>
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setNotaAEliminar(nota)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {data && (
        <ReferentesDialog
          referentes={data.referentes}
          clienteNombre={data.cliente.nombreCompleto}
          open={referentesOpen}
          onOpenChange={setReferentesOpen}
        />
      )}
      <NotaFormDialog
        target={notaTarget}
        open={notaOpen}
        onOpenChange={setNotaOpen}
        onSaved={refetch}
      />
      <AlertDialog open={notaAEliminar != null} onOpenChange={(o) => !o && setNotaAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta nota?</AlertDialogTitle>
            <AlertDialogDescription>La nota se eliminará de forma permanente.</AlertDialogDescription>
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

function DatoRow({ icon, valor }: { icon: React.ReactNode; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="shrink-0">{icon}</span>
      <span className="text-foreground">{valor}</span>
    </div>
  );
}

function ActionButtonShell({
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
      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg bg-muted px-1.5 py-2.5 text-[0.62rem] font-semibold text-muted-foreground transition-colors hover:bg-orange-100 hover:text-orange-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 dark:hover:bg-orange-950 dark:hover:text-orange-300 [&_svg]:size-4"
      aria-disabled={disabled}
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="contents">
      <ActionButtonShell icon={icon} label={label} />
    </button>
  );
}

function ClienteSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-16" />
    </div>
  );
}
