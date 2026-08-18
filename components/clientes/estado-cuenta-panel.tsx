"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, FileDown, Loader2, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtMoney, formatFecha } from "@/lib/format";
import { estadoDeCuentaToText } from "@/lib/estado-cuenta";
import { enviarEstadoCuenta } from "@/lib/compartir";
// Solo el tipo: el módulo arrastra @react-pdf/renderer (fontkit + hyphen) y se
// carga con import() dinámico recién al generar el PDF.
import type { EstadoCuentaPdfCliente } from "@/lib/pdf/estado-cuenta-pdf";
import { PLAN_STATUS_BADGE } from "@/lib/status";
import type { EstadoDeCuenta, ReferenteDeCliente, Telefono } from "@/types";

interface EstadoCuentaPanelProps {
  data: EstadoDeCuenta;
  /** Datos para el encabezado del PDF (no vienen en EstadoDeCuenta) */
  cliente: EstadoCuentaPdfCliente;
  telefonos: Telefono[];
  /** Garantes: destinatario alternativo cuando el cliente no contesta */
  referentes?: ReferenteDeCliente[];
  /**
   * Presente = el envío es obligatorio: se avisa cuando salió para que el
   * diálogo que lo contiene recién ahí se deje cerrar.
   */
  onEnviado?: () => void;
}

interface Destinatario {
  label: string;
  numero: string;
}

/**
 * Estado de cuenta: los planes, los totales y las acciones para compartirlo.
 *
 * Vive aparte del diálogo porque se muestra en dos lados: embebido en la ficha
 * del cliente (que ya trae el estado de cuenta cargado) y dentro del diálogo
 * obligatorio que aparece después de cobrar.
 */
export function EstadoCuentaPanel({
  data,
  cliente,
  telefonos,
  referentes = [],
  onEnviado,
}: EstadoCuentaPanelProps) {
  const [enviando, setEnviando] = useState(false);
  const [destinatarioIdx, setDestinatarioIdx] = useState(0);
  /**
   * Qué plan se manda. `undefined` = toda la cuenta, que es lo de siempre.
   *
   * Un cliente con tres planes recibía un PDF con los tres y no entendía cuál
   * le estaban reclamando. No hace falta ningún endpoint nuevo:
   * `/estado_cuenta` ya viene desglosado por plan.
   */
  const [planId, setPlanId] = useState<number | undefined>(undefined);

  const texto = estadoDeCuentaToText(data);

  const destinatarios: Destinatario[] = [
    ...telefonos.map((t) => ({ label: `${data.clienteNombre} · ${t.numero}`, numero: t.numero })),
    ...referentes.flatMap((r) =>
      r.telefonos.map((t) => ({ label: `${r.nombreCompleto} (garante) · ${t.numero}`, numero: t.numero })),
    ),
  ];
  const numero = destinatarios[destinatarioIdx]?.numero ?? null;

  const imprimir = () => {
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) return;
    win.document.write(
      `<pre style="font-family:monospace;white-space:pre-wrap;padding:24px;font-size:14px">${texto.replace(/\*/g, "")}</pre>`,
    );
    win.document.close();
    win.print();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Estado de cuenta copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  };

  const generarPdf = async () => {
    const { archivoEstadoCuentaPdf } = await import("@/lib/pdf/estado-cuenta-pdf");
    return archivoEstadoCuentaPdf(data, cliente, undefined, planId);
  };

  const descargarPdf = async () => {
    setEnviando(true);
    try {
      const { descargarArchivo } = await import("@/lib/pdf/estado-cuenta-pdf");
      descargarArchivo(await generarPdf());
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setEnviando(false);
    }
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const { descargarArchivo } = await import("@/lib/pdf/estado-cuenta-pdf");
      const salio = await enviarEstadoCuenta(await generarPdf(), texto, numero, descargarArchivo);
      if (salio) {
        toast.success("Estado de cuenta enviado.");
        onEnviado?.();
      }
    } catch {
      toast.error("No se pudo enviar el estado de cuenta.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {data.planes.map((plan) => (
          <div key={plan.planId} className="rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-bold">{plan.nombre}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[0.62rem] font-bold",
                  PLAN_STATUS_BADGE[plan.status],
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

      {/* Con un solo plan no hay nada que elegir: el PDF ya es ese plan. */}
      {data.planes.length > 1 && (
        <div className="space-y-1">
          <label htmlFor="plan-del-pdf" className="text-sm font-semibold">
            Qué se manda en el PDF
          </label>
          <select
            id="plan-del-pdf"
            value={planId ?? ""}
            onChange={(e) => setPlanId(e.target.value === "" ? undefined : Number(e.target.value))}
            disabled={enviando}
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs disabled:opacity-50"
          >
            <option value="">Toda la cuenta ({data.planes.length} planes)</option>
            {data.planes.map((plan) => (
              <option key={plan.planId} value={plan.planId}>
                Solo {plan.nombre} — {fmtMoney(plan.pendiente)} pendiente
              </option>
            ))}
          </select>
        </div>
      )}

      {destinatarios.length > 1 && (
        <div className="space-y-1">
          <select
            aria-label="Destinatario"
            value={destinatarioIdx}
            onChange={(e) => setDestinatarioIdx(Number(e.target.value))}
            disabled={enviando}
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base shadow-xs disabled:opacity-50"
          >
            {destinatarios.map((d, i) => (
              <option key={d.numero} value={i}>
                {d.label}
              </option>
            ))}
          </select>
          {/* En el celular el chat lo elige la hoja de compartir del sistema:
              el PDF va adjunto y el destinatario se toca ahí. */}
          <p className="text-[0.7rem] text-muted-foreground">
            En el celular el contacto se elige al compartir.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={imprimir} disabled={enviando}>
          <Printer />
          Imprimir
        </Button>
        <Button variant="secondary" size="sm" onClick={copiar} disabled={enviando}>
          <Copy />
          Copiar
        </Button>
        <Button variant="secondary" size="sm" onClick={descargarPdf} disabled={enviando}>
          <FileDown />
          PDF
        </Button>
        <Button size="sm" className="ml-auto" onClick={enviar} disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : <MessageCircle />}
          {enviando
            ? "Generando…"
            : onEnviado
              ? "Enviar PDF y continuar"
              : destinatarios.length
                ? "Enviar por WhatsApp"
                : "Enviar"}
        </Button>
      </div>

      {onEnviado && destinatarios.length === 0 && (
        <p className="text-xs text-muted-foreground">
          El cliente no tiene teléfono cargado ni garante con teléfono: el envío solo puede bajar
          el PDF.
        </p>
      )}
    </div>
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
        className={cn("font-mono", bold && "font-bold", danger && "text-red-600 dark:text-red-400")}
      >
        {valor}
      </span>
    </div>
  );
}
