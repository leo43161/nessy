import { getHistorico } from "@/services/cobros.service";
import { getCobradores } from "@/services/cobradores.service";
import { addDays, todayISO } from "@/lib/format";
import { VENTANA_PASADO } from "@/lib/constants";
import { esCobrado, esVencido } from "@/lib/status";
import type { CobroDelDia, EstadisticasCobrador, RangoFechas, RankingCobrador } from "@/types";

/** Ranking de cobradores para una fecha (efectividad + dinero cobrado) */
function calcularRanking(cobros: CobroDelDia[], cobradores: { id: number; nombreCompleto: string }[]): RankingCobrador[] {
  const ranking = cobradores.map((cob) => {
    const mios = cobros.filter((c) => c.cobradorAsignadoId === cob.id);
    const cobrados = mios.filter((c) => esCobrado(c.estado));
    const montoCobrado = cobrados.reduce((s, c) => s + c.montoEsperado, 0);
    return {
      cobradorId: cob.id,
      nombre: cob.nombreCompleto,
      efectividad: mios.length > 0 ? (cobrados.length / mios.length) * 100 : 0,
      montoCobrado,
      puesto: 0,
    };
  });
  ranking.sort((a, b) => b.efectividad - a.efectividad || b.montoCobrado - a.montoCobrado);
  ranking.forEach((r, i) => (r.puesto = i + 1));
  return ranking;
}

/** Estadísticas completas del cobrador para una fecha */
export async function getEstadisticas(
  cobradorId: number,
  fecha: string,
  /**
   * Período a mirar. Sin rango se usa la ventana de siempre alrededor de
   * `fecha` (10 días atrás, 8 adelante), que es el worklist del cobrador.
   */
  rango?: RangoFechas,
): Promise<EstadisticasCobrador> {
  // `/estadisticas` NO existe: es la tarea B.3, todavía sin hacer del lado de
  // la base. Mientras tanto se calcula acá desde `/cuotas`, que trae todo lo
  // necesario: el asignado, quién cobró de verdad, el monto y la fecha de pago.
  //
  // ponytail: trae el histórico entero y agrega en el cliente, igual que
  // lib/agregados.ts del panel admin. Con el volumen actual alcanza; cuando
  // crezca hay que moverlo al SP de B.3 junto con la paginación.
  const [cobros, cobradores] = await Promise.all([getHistorico(), getCobradores()]);

  const hoy = todayISO();
  const delPeriodo = enPeriodo(cobros, fecha, rango);
  const ranking = calcularRanking(delPeriodo, cobradores);
  const mio = ranking.find((r) => r.cobradorId === cobradorId);
  const mejor = ranking[0];

  const cobrosMios = delPeriodo.filter((c) => c.cobradorAsignadoId === cobradorId);
  const totalDia = cobrosMios.length;
  const cobradosDia = cobrosMios.filter((c) => esCobrado(c.estado)).length;
  const gestionadosDia = cobrosMios.filter((c) => c.estado !== "Pendiente").length;

  // Asistencias: cuotas mías que terminó cobrando otro, en los últimos 6 meses.
  const desde = addDays(-182, hoy);
  const asistencias = cobros.filter(
    (c) =>
      c.cobradorAsignadoId === cobradorId &&
      c.cobradoPorId != null &&
      c.cobradoPorId !== cobradorId &&
      (c.fechaDePago ?? "") >= desde,
  ).length;

  // Promedio diario: lo que cobré yo, dividido por los días en que cobré algo.
  const porDia = new Map<string, number>();
  for (const c of cobros) {
    if (c.cobradoPorId !== cobradorId || !c.fechaDePago) continue;
    porDia.set(c.fechaDePago, (porDia.get(c.fechaDePago) ?? 0) + c.montoEsperado);
  }
  const totalDinero = [...porDia.values()].reduce((s, v) => s + v, 0);

  const dineroPerdido = cobrosMios
    .filter((c) => esVencido(c.estado, c.fechaAcordada, hoy))
    .reduce((s, c) => s + c.montoEsperado, 0);

  return {
    ranking,
    miPuesto: mio?.puesto ?? ranking.length,
    totalCobradores: ranking.length,
    brechaConElMejor:
      mejor && mio && mejor.efectividad > 0
        ? ((mejor.efectividad - mio.efectividad) / mejor.efectividad) * 100
        : 0,
    efectividadPersonal: totalDia > 0 ? (cobradosDia / totalDia) * 100 : 0,
    completitud: totalDia > 0 ? (gestionadosDia / totalDia) * 100 : 0,
    asistencias6Meses: asistencias,
    promedioDiario: porDia.size > 0 ? totalDinero / porDia.size : 0,
    dineroPerdido,
  };
}

/**
 * Cuotas del período elegido.
 *
 * Con rango explícito manda el rango; sin él, la ventana del worklist alrededor
 * de la fecha de trabajo. Se filtra por `fechaAcordada` —cuándo vencía— y no
 * por cuándo se cobró: la efectividad de un período es sobre lo que había que
 * cobrar en ese período, no sobre lo que entró.
 */
function enPeriodo(
  cobros: CobroDelDia[],
  fecha: string,
  rango?: RangoFechas,
): CobroDelDia[] {
  const lo = rango ? rango.desde : addDays(-VENTANA_PASADO, fecha);
  // Sin rango, la misma ventana que la lista del día: hasta la fecha de
  // trabajo y ni un día más. Antes llegaba 8 días al futuro y el desempeño
  // del día contaba cuotas que todavía no habían vencido.
  const hi = rango ? rango.hasta : fecha;
  return cobros.filter((c) => c.fechaAcordada >= lo && c.fechaAcordada <= hi);
}
