import { api, USE_MOCK } from "@/services/api";
import { cobrosDeLaVentana, delay, getDb, toCobroDelDia } from "@/services/mock/db";
import { addDays, todayISO } from "@/lib/format";
import { esCobrado, esVencido } from "@/lib/status";
import type { CobroDelDia, EstadisticasCobrador, RankingCobrador } from "@/types";

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
  fecha: string
): Promise<EstadisticasCobrador> {
  if (USE_MOCK) {
    const db = getDb();
    const hoy = todayISO();
    const cobros = cobrosDeLaVentana(db, fecha);
    const ranking = calcularRanking(cobros, db.cobradores);
    const mio = ranking.find((r) => r.cobradorId === cobradorId);
    const mejor = ranking[0];

    // Cobros del cobrador en la ventana
    const cobrosMios = cobros.filter((c) => c.cobradorAsignadoId === cobradorId);
    const totalDia = cobrosMios.length;
    const cobradosDia = cobrosMios.filter((c) => esCobrado(c.estado)).length;
    const gestionadosDia = cobrosMios.filter((c) => c.estado !== "Pendiente").length;

    // Asistencias últimos 6 meses: cobros de mis clientes registrados por OTRO cobrador
    const desde = addDays(-182);
    const misClientes = new Set(
      db.clienteCobrador.filter((cc) => cc.idCobrador === cobradorId).map((cc) => cc.idCliente)
    );
    const asistencias = db.pagosRealizados.filter((pr) => {
      if (pr.fechaDePago < desde) return false;
      if (pr.idCobrador === cobradorId) return false;
      const pp = db.pagosPorRealizar.find((p) => p.id === pr.idPago);
      const cobro = pp ? toCobroDelDia(db, pp) : null;
      return cobro && misClientes.has(cobro.cliente.id) && cobro.cobradorAsignadoId === cobradorId;
    }).length;

    // Promedio diario: dinero cobrado por mí / días distintos con cobro
    const dineroPorFecha = new Map<string, number>();
    for (const pr of db.pagosRealizados) {
      if (pr.idCobrador !== cobradorId) continue;
      const pp = db.pagosPorRealizar.find((p) => p.id === pr.idPago);
      if (pp) {
        dineroPorFecha.set(pr.fechaDePago, (dineroPorFecha.get(pr.fechaDePago) ?? 0) + pp.montoEsperado);
      }
    }
    const totalDinero = [...dineroPorFecha.values()].reduce((s, v) => s + v, 0);
    const promedioDiario = dineroPorFecha.size > 0 ? totalDinero / dineroPorFecha.size : 0;

    // Dinero perdido: cuotas de mis clientes incomunicadas o vencidas (en la ventana)
    const dineroPerdido = cobrosMios
      .filter((c) => c.estado === "Incomunicado" || esVencido(c.estado, c.fechaAcordada, hoy))
      .reduce((s, c) => s + c.montoEsperado, 0);

    const stats: EstadisticasCobrador = {
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
      promedioDiario,
      dineroPerdido,
    };
    return delay(stats, 200);
  }
  const { data } = await api.get<EstadisticasCobrador>("/estadisticas", {
    params: { cobradorId, fecha },
  });
  return data;
}
