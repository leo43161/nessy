"use client";

import { useEffect, useState } from "react";
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
import { EstadoCuentaPanel } from "@/components/clientes/estado-cuenta-panel";
import { getEstadoDeCuenta } from "@/services/clientes.service";
import { formatFecha } from "@/lib/format";
// Solo el tipo: el módulo del PDF se carga con import() dinámico, no acá.
import type { EstadoCuentaPdfCliente } from "@/lib/pdf/estado-cuenta-pdf";
import type { EstadoDeCuenta, ReferenteDeCliente, Telefono } from "@/types";

interface EstadoCuentaDialogProps {
  clienteId: number | null;
  /** Teléfonos del cliente, hasta que llegue la respuesta del servidor */
  telefonos: Telefono[];
  /** Datos para el encabezado del PDF (no vienen en EstadoDeCuenta) */
  cliente: EstadoCuentaPdfCliente;
  /**
   * Envío obligatorio: el diálogo no se cierra hasta que el cobrador mande el
   * estado de cuenta. Es el caso de después de cobrar y de la advertencia.
   */
  obligatorio?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Estado de cuenta del cliente, con las acciones para compartirlo */
export function EstadoCuentaDialog({
  clienteId,
  telefonos,
  cliente,
  obligatorio = false,
  open,
  onOpenChange,
}: EstadoCuentaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !obligatorio && onOpenChange(o)}>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        showCloseButton={!obligatorio}
        // Obligatorio: ni Escape ni click afuera lo cierran. La única salida es
        // enviar. Radix cierra por defecto en los dos casos.
        onEscapeKeyDown={(e) => obligatorio && e.preventDefault()}
        onPointerDownOutside={(e) => obligatorio && e.preventDefault()}
        onInteractOutside={(e) => obligatorio && e.preventDefault()}
      >
        {/* El contenido se monta al abrir: arranca cargando sin setState sincrónico */}
        {open && clienteId != null && (
          <EstadoCuentaContent
            clienteId={clienteId}
            telefonosIniciales={telefonos}
            cliente={cliente}
            obligatorio={obligatorio}
            onCerrar={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EstadoCuentaContent({
  clienteId,
  telefonosIniciales,
  cliente,
  obligatorio,
  onCerrar,
}: {
  clienteId: number;
  telefonosIniciales: Telefono[];
  cliente: EstadoCuentaPdfCliente;
  obligatorio: boolean;
  onCerrar: () => void;
}) {
  const [data, setData] = useState<EstadoDeCuenta | null>(null);
  const [telefonos, setTelefonos] = useState<Telefono[]>(telefonosIniciales);
  const [referentes, setReferentes] = useState<ReferenteDeCliente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    getEstadoDeCuenta(clienteId)
      .then((r) => {
        if (!activo) return;
        setData(r.estadoDeCuenta);
        setReferentes(r.referentes);
        // Los del servidor mandan; los de la prop son solo para el primer render.
        if (r.telefonos.length) setTelefonos(r.telefonos);
      })
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [clienteId]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Estado de Cuenta</DialogTitle>
        <DialogDescription className="text-center">
          {obligatorio
            ? "Mandale el comprobante al cliente para cerrar la visita."
            : data
              ? `${data.clienteNombre} · ${formatFecha(data.generadoEl)}`
              : "Cargando…"}
        </DialogDescription>
      </DialogHeader>

      {cargando || !data ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <EstadoCuentaPanel
            data={data}
            cliente={cliente}
            telefonos={telefonos}
            referentes={referentes}
            onEnviado={obligatorio ? onCerrar : undefined}
          />

          {!obligatorio && (
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onCerrar}>
                Cerrar
              </Button>
            </DialogFooter>
          )}
        </>
      )}
    </>
  );
}
