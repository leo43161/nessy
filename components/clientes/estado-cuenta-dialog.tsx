"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { getEstadoDeCuenta } from "@/services/clientes.service";
import { cn } from "@/lib/utils";
import { fmtMoney, formatFecha } from "@/lib/format";
import { estadoDeCuentaToText } from "@/lib/estado-cuenta";
// Solo el tipo: el módulo arrastra @react-pdf/renderer (fontkit + hyphen) y se
// carga con import() dinámico en descargarPdf, no en el bundle de la ruta.
import type { EstadoCuentaPdfCliente } from "@/lib/pdf/estado-cuenta-pdf";
import { PLAN_STATUS_BADGE } from "@/lib/status";
import type { EstadoDeCuenta, Telefono } from "@/types";

interface EstadoCuentaDialogProps {
  clienteId: number | null;
  /** Teléfonos del cliente para el botón de WhatsApp */
  telefonos: Telefono[];
  /** Datos para el encabezado del PDF (no vienen en EstadoDeCuenta) */
  cliente: EstadoCuentaPdfCliente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Estado de cuenta del cliente, con opciones para compartirlo */
export function EstadoCuentaDialog({
  clienteId,
  telefonos,
  cliente,
  open,
  onOpenChange,
}: EstadoCuentaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {/* El contenido se monta al abrir: arranca cargando sin setState sincrónico */}
        {open && clienteId != null && (
          <EstadoCuentaContent clienteId={clienteId} telefonos={telefonos} cliente={cliente} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EstadoCuentaContent({
  clienteId,
  telefonos,
  cliente,
}: {
  clienteId: number;
  telefonos: Telefono[];
  cliente: EstadoCuentaPdfCliente;
}) {
  const [data, setData] = useState<EstadoDeCuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    let activo = true;
    getEstadoDeCuenta(clienteId)
      .then((ec) => activo && setData(ec))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [clienteId]);

  const texto = data ? estadoDeCuentaToText(data) : "";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Estado de cuenta copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  const imprimir = () => {
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) return;
    win.document.write(
      `<pre style="font-family:monospace;white-space:pre-wrap;padding:24px;font-size:14px">${texto.replace(/\*/g, "")}</pre>`
    );
    win.document.close();
    win.print();
  };

  const descargarPdf = async () => {
    if (!data) return;
    setGenerandoPdf(true);
    try {
      const { descargarEstadoCuentaPdf } = await import("@/lib/pdf/estado-cuenta-pdf");
      await descargarEstadoCuentaPdf(data, cliente);
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Estado de Cuenta</DialogTitle>
        <DialogDescription className="text-center">
          {data ? `${data.clienteNombre} · ${formatFecha(data.generadoEl)}` : "Cargando…"}
        </DialogDescription>
      </DialogHeader>

      {cargando || !data ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data.planes.map((plan) => (
              <div key={plan.planId} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{plan.nombre}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[0.62rem] font-bold",
                      PLAN_STATUS_BADGE[plan.status]
                    )}
                  >
                    {plan.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <Row label="Cuotas" valor={`${plan.cuotasPagadas}/${plan.cuotasTotales}`} />
                  <Row label="Pagado" valor={fmtMoney(plan.pagado)} />
                  <Row label="Pendiente" valor={fmtMoney(plan.pendiente)} />
                  {plan.vencido > 0 && <Row label="Vencido" valor={fmtMoney(plan.vencido)} danger />}
                </div>
                {plan.proximaCuota && (
                  <div className="mt-2 border-t pt-2 text-[0.7rem] text-muted-foreground">
                    Próxima cuota: {fmtMoney(plan.proximaCuota.monto)} el{" "}
                    {formatFecha(plan.proximaCuota.fecha)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <Row label="Total pagado" valor={fmtMoney(data.totalPagado)} bold />
            <Row label="Saldo pendiente" valor={fmtMoney(data.saldoPendiente)} bold />
            {data.totalVencido > 0 && (
              <Row label="Total vencido" valor={fmtMoney(data.totalVencido)} bold danger />
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={imprimir}>
              <Printer />
              Imprimir
            </Button>
            <Button variant="secondary" size="sm" onClick={copiar}>
              <Copy />
              Copiar
            </Button>
            <Button variant="secondary" size="sm" onClick={descargarPdf} disabled={generandoPdf}>
              <FileDown />
              {generandoPdf ? "Generando…" : "Descargar PDF"}
            </Button>
            <WhatsappButton telefonos={telefonos} mensaje={texto}>
              <Button size="sm" disabled={telefonos.length === 0}>
                Enviar por WhatsApp
              </Button>
            </WhatsappButton>
          </DialogFooter>
        </>
      )}
    </>
  );
}

function Row({
  label,
  valor,
  bold,
  danger,
}: {
  label: string;
  valor: string;
  bold?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono",
          bold && "font-bold",
          danger && "text-red-600 dark:text-red-400"
        )}
      >
        {valor}
      </span>
    </div>
  );
}
