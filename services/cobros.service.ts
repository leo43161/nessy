import { api, USE_MOCK } from "@/services/api";
import { delay, getDb, nextId, saveDb, toCobroDia } from "@/services/mock/db";
import { todayISO } from "@/lib/format";
import type { ActualizarCobroPayload, CobroDia, ResumenDia } from "@/types";

/** Cobros programados de un cobrador para una fecha */
export async function getCobrosDia(cobradorId: number, fecha: string): Promise<CobroDia[]> {
  if (USE_MOCK) {
    const db = getDb();
    const cobros = db.doPayments
      .filter((dp) => {
        if (dp.fecha !== fecha) return false;
        const sched = db.schedules.find((s) => s.id === dp.scheduleId);
        return sched?.cobradorId === cobradorId;
      })
      .map((dp) => toCobroDia(dp, db))
      .filter((c): c is CobroDia => c !== null);
    return delay(cobros);
  }
  const { data } = await api.get<CobroDia[]>("/cobros", { params: { cobradorId, fecha } });
  return data;
}

/** Actualiza el estado de un cobro; si pasa a Cobrado registra la transacción */
export async function actualizarCobro(payload: ActualizarCobroPayload): Promise<CobroDia> {
  if (USE_MOCK) {
    const db = getDb();
    const dp = db.doPayments.find((d) => d.id === payload.id);
    if (!dp) throw new Error("Cobro no encontrado.");
    dp.status = payload.status;
    if (payload.status === "Paid") {
      dp.scCobradorId = payload.scCobradorId ?? null;
      dp.scNotas = payload.scNotas ?? null;
      const yaRegistrada = db.transacciones.some((t) => t.cobroId === dp.id);
      if (!yaRegistrada) {
        const sched = db.schedules.find((s) => s.id === dp.scheduleId);
        db.transacciones.push({
          id: nextId(db.transacciones),
          clienteId: sched?.clienteId ?? 0,
          cobroId: dp.id,
          tipo: "PAGO",
          concepto: "Cuota cobrada",
          monto: dp.monto,
          fecha: todayISO(),
        });
      }
    } else {
      dp.scCobradorId = null;
      dp.scNotas = null;
    }
    saveDb();
    const cobro = toCobroDia(dp, db);
    if (!cobro) throw new Error("Cobro inconsistente.");
    return delay(cobro);
  }
  const { data } = await api.patch<CobroDia>(`/cobros/${payload.id}`, payload);
  return data;
}

/** Resumen del día para el dashboard */
export async function getResumenDia(cobradorId: number, fecha: string): Promise<ResumenDia> {
  if (USE_MOCK) {
    const db = getDb();
    const cobros = await getCobrosDia(cobradorId, fecha);
    const misClientes = new Set(
      db.schedules.filter((s) => s.cobradorId === cobradorId).map((s) => s.clienteId)
    );
    const resumen: ResumenDia = {
      totalCobros: cobros.length,
      cobrados: cobros.filter((c) => c.status === "Paid").length,
      pendientes: cobros.filter((c) => c.status === "Pending").length,
      vencidos: cobros.filter((c) => c.status === "Overdue").length,
      ilocalizables: cobros.filter((c) => c.status === "Unreachable").length,
      montoCobrado: cobros
        .filter((c) => c.status === "Paid")
        .reduce((sum, c) => sum + c.monto, 0),
      totalTransacciones: db.transacciones.filter(
        (t) => t.tipo === "PAGO" && misClientes.has(t.clienteId)
      ).length,
    };
    return delay(resumen, 150);
  }
  const { data } = await api.get<ResumenDia>("/cobros/resumen", { params: { cobradorId, fecha } });
  return data;
}
