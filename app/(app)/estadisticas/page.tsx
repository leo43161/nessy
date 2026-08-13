"use client";

import { useEffect, useState } from "react";
import { Crown, HandCoins, Target, TrendingDown, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEstadisticas } from "@/store/slices/estadisticas.slice";
import { cn } from "@/lib/utils";
import { fmtMoney, fmtPct, formatFecha, todayISO } from "@/lib/format";
import { PRESETS, rangoDePeriodo, type PeriodoId } from "@/lib/periodos";
import { Input } from "@/components/ui/input";
import type { EstadisticasCobrador, RangoFechas } from "@/types";

/**
 * Período que se está mirando.
 *
 * "Jornada" —el arranque— es la ventana del worklist alrededor de la fecha de
 * trabajo: es lo que el cobrador mira antes que nada. El resto son los períodos
 * de siempre, y "Rango" abre las dos fechas a mano.
 */
function FiltroPeriodo({
  activo,
  onElegir,
  rangoManual,
  onRangoManual,
}: {
  activo: PeriodoId | null;
  onElegir: (p: PeriodoId | null) => void;
  rangoManual: RangoFechas;
  onRangoManual: (r: RangoFechas) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto">
        <Chip activo={activo === null} onClick={() => onElegir(null)}>
          Jornada
        </Chip>
        {PRESETS.map((p) => (
          <Chip key={p.id} activo={activo === p.id} onClick={() => onElegir(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>

      {activo === "personalizado" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Fecha desde"
            value={rangoManual.desde}
            onChange={(e) => onRangoManual({ ...rangoManual, desde: e.target.value })}
            className="h-8 flex-1 text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            aria-label="Fecha hasta"
            min={rangoManual.desde}
            value={rangoManual.hasta}
            onChange={(e) => onRangoManual({ ...rangoManual, hasta: e.target.value })}
            className="h-8 flex-1 text-xs"
          />
        </div>
      )}
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export default function EstadisticasPage() {
  const dispatch = useAppDispatch();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const { data, status } = useAppSelector((s) => s.estadisticas);

  // `null` = la jornada, que es la ventana del worklist alrededor de la fecha
  // de trabajo. Es el arranque porque el cobrador mira su día antes que nada.
  const [periodo, setPeriodo] = useState<PeriodoId | null>(null);
  const [rangoManual, setRangoManual] = useState<RangoFechas>({ desde: "", hasta: "" });

  const rango =
    periodo === "personalizado"
      ? rangoManual.desde !== "" && rangoManual.hasta !== ""
        ? rangoManual
        : undefined
      : periodo
        ? rangoDePeriodo(periodo, workDate ?? todayISO())
        : undefined;

  useEffect(() => {
    if (!cobrador || !workDate) return;
    dispatch(fetchEstadisticas({ cobradorId: cobrador.id, fecha: workDate, rango }));
    // `rango` se recalcula en cada render; lo que importa son sus valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrador, workDate, rango?.desde, rango?.hasta, dispatch]);

  // Los filtros van arriba de todo y también mientras carga o falla: si
  // desaparecieran, un período sin datos dejaría al cobrador sin forma de
  // volver a otro.
  const filtros = (
    <FiltroPeriodo
      activo={periodo}
      onElegir={setPeriodo}
      rangoManual={rangoManual}
      onRangoManual={setRangoManual}
    />
  );

  if (status === "failed") {
    return (
      <div className="space-y-4">
        {filtros}
        <EmptyState icon="⚠️">No se pudieron cargar las estadísticas.</EmptyState>
      </div>
    );
  }

  if (!data || status === "loading") {
    return (
      <div className="space-y-4">
        {filtros}
        <Skeleton className="h-48 rounded-xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filtros}

      {/* Ranking de cobradores */}
      <Card className="gap-3 px-4 py-4">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Crown className="size-4 text-orange-500" />
          Ranking de Cobradores ({formatFecha(workDate)})
        </div>
        <Ranking data={data} miId={cobrador?.id} />
      </Card>

      {/* Estadísticas personales */}
      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Tu desempeño
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Target className="size-4" />}
            label="Efectividad de cobro"
            valor={fmtPct(data.efectividadPersonal)}
            sub="cobros logrados"
            tone="green"
          />
          <StatCard
            icon={<Target className="size-4" />}
            label="Completitud"
            valor={fmtPct(data.completitud)}
            sub="clientes gestionados"
            tone="blue"
          />
          <StatCard
            icon={<TriangleAlert className="size-4" />}
            label="Asistencias (6 meses)"
            valor={String(data.asistencias6Meses)}
            sub="te cubrieron cobros"
            tone={data.asistencias6Meses > 0 ? "red" : "muted"}
          />
        </div>
      </div>

      {/* Numerales */}
      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Dinero
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            icon={<HandCoins className="size-4" />}
            label="Promedio diario"
            valor={fmtMoney(data.promedioDiario)}
            sub="que traés por día"
            tone="orange"
            big
          />
          <StatCard
            icon={<TrendingDown className="size-4" />}
            label="Dinero perdido"
            valor={fmtMoney(data.dineroPerdido)}
            sub="vencidos + incomunicados"
            tone="red"
            big
          />
        </div>
      </div>
    </div>
  );
}

function Ranking({ data, miId }: { data: EstadisticasCobrador; miId?: number }) {
  const maxMonto = Math.max(1, ...data.ranking.map((r) => r.montoCobrado));
  return (
    <div className="flex flex-col gap-2">
      {data.ranking.map((r) => {
        const yo = r.cobradorId === miId;
        return (
          <div
            key={r.cobradorId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-2",
              yo ? "bg-orange-100 dark:bg-orange-950/50" : "bg-muted/40"
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                r.puesto === 1
                  ? "bg-orange-500 text-white"
                  : "bg-background text-muted-foreground"
              )}
            >
              {r.puesto}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span className="truncate">{r.nombre.split(" ")[0]}</span>
                {yo && <span className="text-[0.62rem] text-orange-600 dark:text-orange-400">(vos)</span>}
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                  style={{ width: `${(r.montoCobrado / maxMonto) * 100}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-xs font-bold">{fmtPct(r.efectividad)}</div>
              <div className="font-mono text-[0.68rem] text-muted-foreground">
                {fmtMoney(r.montoCobrado)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TONES = {
  green: "text-green-600 dark:text-green-400",
  blue: "text-blue-600 dark:text-blue-400",
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
  muted: "text-foreground",
};

function StatCard({
  icon,
  label,
  valor,
  sub,
  tone,
  big,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  sub: string;
  tone: keyof typeof TONES;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <div className={cn("font-mono font-bold", big ? "text-lg" : "text-2xl", TONES[tone])}>
        {valor}
      </div>
      <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{sub}</div>
    </div>
  );
}
