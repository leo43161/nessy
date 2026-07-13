"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchResumenDia } from "@/store/slices/cobros.slice";
import { cn } from "@/lib/utils";
import { formatFecha } from "@/lib/format";
import { COBRO_STATUS } from "@/lib/status";
import type { CobroStatus, ResumenDia } from "@/types";

export default function EstadisticasPage() {
  const dispatch = useAppDispatch();
  const usuario = useAppSelector((s) => s.auth.usuario);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const { resumen, resumenStatus } = useAppSelector((s) => s.cobros);

  // Se refresca al entrar y al cambiar la fecha de trabajo
  useEffect(() => {
    if (usuario && workDate) {
      dispatch(fetchResumenDia({ cobradorId: usuario.id, fecha: workDate }));
    }
  }, [usuario, workDate, dispatch]);

  if (!resumen || resumenStatus === "loading") {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
        <Skeleton className="col-span-full h-48 rounded-xl" />
      </div>
    );
  }

  const problemas = resumen.vencidos + resumen.ilocalizables;

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label={`Cobros Hoy (${formatFecha(workDate)})`}
          valor={`${resumen.cobrados}/${resumen.totalCobros}`}
          sub="cobros completados"
          highlight
        />
        <StatCard
          label="Monto Cobrado Hoy"
          valor={`ARP ${resumen.montoCobrado.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`}
          sub="total en efectivo"
        />
        <StatCard
          label="Total Transacciones"
          valor={String(resumen.totalTransacciones)}
          sub="pagos registrados"
        />
        <StatCard
          label="Problemas Hoy"
          valor={String(problemas)}
          sub="vencidos + ilocalizables"
          valorClass="text-red-500"
        />
      </div>

      <Card className="gap-3 px-4 py-4">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Estado de Cobros (Hoy)
        </div>
        <StatusBars resumen={resumen} />
      </Card>
    </>
  );
}

function StatCard({
  label,
  valor,
  sub,
  highlight,
  valorClass,
}: {
  label: string;
  valor: string;
  sub: string;
  highlight?: boolean;
  valorClass?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3.5 shadow-sm",
        highlight
          ? "border-transparent bg-gradient-to-br from-orange-500 to-orange-600 text-white"
          : "bg-card"
      )}
    >
      <div
        className={cn(
          "mb-1 text-[0.7rem] font-semibold tracking-wide uppercase",
          highlight ? "text-white/75" : "text-muted-foreground"
        )}
      >
        {label}
      </div>
      <div className={cn("font-mono text-xl font-bold", !highlight && valorClass)}>{valor}</div>
      <div className={cn("mt-0.5 text-[0.7rem]", highlight ? "text-white/75" : "text-muted-foreground")}>
        {sub}
      </div>
    </div>
  );
}

function StatusBars({ resumen }: { resumen: ResumenDia }) {
  const counts: Record<CobroStatus, number> = {
    Paid: resumen.cobrados,
    Pending: resumen.pendientes,
    Overdue: resumen.vencidos,
    Unreachable: resumen.ilocalizables,
  };
  const max = Math.max(1, ...Object.values(counts));

  if (resumen.totalCobros === 0) {
    return <div className="text-sm text-muted-foreground">Sin datos para esta fecha.</div>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {(Object.keys(counts) as CobroStatus[]).map((status) => (
        <div key={status} className="flex items-center gap-2.5">
          <span className="w-28 shrink-0 text-xs font-medium">{COBRO_STATUS[status].label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", COBRO_STATUS[status].bar)}
              style={{ width: `${(counts[status] / max) * 100}%` }}
            />
          </div>
          <span className="w-7 shrink-0 text-right font-mono text-xs font-semibold text-muted-foreground">
            {counts[status]}
          </span>
        </div>
      ))}
    </div>
  );
}
