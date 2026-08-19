"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, FileDown, Loader2, MessageCircle, MessageSquareText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtMoney, formatFecha } from "@/lib/format";
import { estadoDeCuentaToText, etiquetaCuotaPendiente } from "@/lib/estado-cuenta";
import { enviarEstadoCuenta } from "@/lib/compartir";
import { enlaceSms, medirSms, resumenParaSms } from "@/lib/sms";
import { EMPRESA_NOMBRE } from "@/lib/marca";
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
  /**
   * El plan que se está tocando en este momento: el del cobro que se acaba de
   * registrar, o el de la cuota que se marcó atrasada.
   *
   * Cuando viene, el PDF sale de ESE plan y no se puede elegir otro. Es lo que
   * pidió el cliente y es lo correcto: el comprobante de un cobro es del plan
   * que se cobró. Con la lista completa, un cobrador apurado mandaba el
   * comprobante de una financiación que no era la que acababa de tocar, y el
   * cliente recibía por escrito un saldo que no tenía nada que ver.
   *
   * Sigue pudiendo mandar la cuenta entera —a veces el cliente la pide— pero
   * son dos opciones, no una lista de planes.
   *
   * Sin esta prop (la ficha del cliente) se eligen todos, que es donde tiene
   * sentido elegir.
   */
  planEnContexto?: number;
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
  planEnContexto,
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
  const [planId, setPlanId] = useState<number | undefined>(planEnContexto);

  /** El plan que se está tocando, si el que abrió este panel dijo cuál es */
  const planDelContexto = planEnContexto
    ? data.planes.find((p) => p.planId === planEnContexto)
    : undefined;

  const texto = estadoDeCuentaToText(data);

  // El SMS lleva su propio texto, no el de WhatsApp: aquel usa `*` para las
  // negritas —que en un mensaje de texto se ven tal cual— y lista plan por
  // plan, lo que multiplicaría el costo. Ver lib/sms.ts.
  const textoSms = resumenParaSms(data, EMPRESA_NOMBRE);
  const medida = medirSms(textoSms);

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
            {/* "Próxima cuota" solo si de verdad todavía no venció: la primera
                impaga puede ser de hace meses, y el cobrador le muestra esta
                pantalla al cliente. */}
            {plan.proximaCuota && (
              <div className="mt-2 border-t pt-2 text-[0.7rem] text-muted-foreground">
                {etiquetaCuotaPendiente(plan.proximaCuota.fecha, data.generadoEl)}:{" "}
                {fmtMoney(plan.proximaCuota.monto)} el {formatFecha(plan.proximaCuota.fecha)}
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
            {/* Con un plan en contexto —un cobro, una advertencia— las únicas
                dos opciones son ESE plan y la cuenta entera. Los otros planes
                del cliente no aparecen: el comprobante de lo que se acaba de
                hacer no puede ser de otra financiación. */}
            {planDelContexto ? (
              <option value={planDelContexto.planId}>
                Solo {planDelContexto.nombre} — {fmtMoney(planDelContexto.pendiente)} pendiente
              </option>
            ) : (
              data.planes.map((plan) => (
                <option key={plan.planId} value={plan.planId}>
                  Solo {plan.nombre} — {fmtMoney(plan.pendiente)} pendiente
                </option>
              ))
            )}
            <option value="">Toda la cuenta ({data.planes.length} planes)</option>
          </select>
          {planDelContexto && (
            <p className="text-[0.7rem] text-muted-foreground">
              El comprobante es de la financiación que acabás de tocar. Para mandar el de otra,
              entrá por la ficha del cliente.
            </p>
          )}
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

      {/* Qué se va a mandar y cuánto sale. Un mensaje de texto se cobra por
          pieza, así que el cobrador tiene que poder ver si son una o tres
          ANTES de tocar, no después. */}
      <details className="rounded-lg border border-input bg-card px-3 py-2">
        <summary className="cursor-pointer list-none text-sm font-semibold">
          El mensaje de texto ·{" "}
          <span
            className={
              medida.piezas > 1
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }
          >
            {medida.piezas === 1 ? "entra en 1 mensaje" : `son ${medida.piezas} mensajes`}
          </span>
        </summary>
        <pre className="mt-2 font-sans text-sm whitespace-pre-wrap text-muted-foreground">
          {textoSms}
        </pre>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {medida.caracteres} caracteres · quedan {medida.restantes}
          {medida.alfabeto === "UCS-2" &&
            " · tiene un carácter que achica el mensaje a 70 por pieza"}
        </p>
      </details>

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
        {/* Abre la app de mensajes del teléfono con el resumen ya escrito.
            Es un enlace y no un botón con onClick porque `sms:` lo tiene que
            resolver el sistema operativo, no el navegador. */}
        <Button variant="secondary" size="sm" asChild disabled={enviando}>
          <a href={enlaceSms(numero, textoSms)}>
            <MessageSquareText />
            SMS
          </a>
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
