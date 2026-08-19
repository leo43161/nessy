"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { getReferentesDeCliente } from "@/services/clientes.service";
import { cn } from "@/lib/utils";
import type { ReferenteDeCliente } from "@/types";

interface ReferentesClienteProps {
  clienteId: number;
  /** Ya cargados por la ficha: evitan pedirlos de nuevo */
  referentes?: ReferenteDeCliente[];
  /**
   * Arranca plegado. En el modal de cobro sí: el garante es el plan B y
   * desplegado empuja el botón de cobrar abajo del scroll.
   */
  plegado?: boolean;
}

/**
 * Quién responde por el cliente, con su WhatsApp a un toque.
 *
 * Antes vivían detrás de otro modal: para llegar al teléfono del garante había
 * que cerrar el cobro, buscar el cliente y abrir dos pantallas más. Y es
 * justamente cuando el cliente no atiende que hace falta ese número.
 */
export function ReferentesCliente({
  clienteId,
  referentes,
  plegado = false,
}: ReferentesClienteProps) {
  const [propios, setPropios] = useState<ReferenteDeCliente[] | null>(referentes ?? null);
  const [abierto, setAbierto] = useState(!plegado);

  useEffect(() => {
    if (referentes) return;
    let activo = true;
    getReferentesDeCliente(clienteId)
      .then((r) => activo && setPropios(r))
      .catch(() => activo && setPropios([]));
    return () => {
      activo = false;
    };
  }, [clienteId, referentes]);

  if (propios === null) return <Skeleton className="h-10" />;
  if (propios.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-1.5 text-[0.68rem] font-bold tracking-widest text-muted-foreground uppercase"
      >
        <Users className="size-3.5" />
        Referentes ({propios.length})
        <ChevronDown className={cn("size-3.5 transition-transform", abierto && "rotate-180")} />
      </button>

      {abierto &&
        propios.map((ref) => (
          <div
            key={`${ref.tipo}-${ref.id}`}
            className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2"
          >
            <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">
              {ref.tipo}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{ref.nombreCompleto}</div>
              {/* Lo que antes solo se veía abriendo el modal aparte */}
              <div className="truncate text-[0.62rem] text-muted-foreground">
                {[ref.dni && `DNI ${ref.dni}`, ref.direccion].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            {ref.telefonos.length > 0 && <WhatsappButton telefonos={ref.telefonos} />}
          </div>
        ))}
    </div>
  );
}
