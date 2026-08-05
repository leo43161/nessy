import { api, USE_MOCK } from "@/services/api";
import { cobrosDeLaVentana, delay, getDb, nextId, saveDb, toCobroDelDia } from "@/services/mock/db";
import { todayISO } from "@/lib/format";
import { CONCEPTO_POR_ESTADO } from "@/lib/status";
import type { CobroDelDia, FiltroCobros, RegistrarPagoPayload } from "@/types";

/**
 * Worklist de cobros del cobrador para la fecha de trabajo (ventana de días
 * alrededor de esa fecha). cobrador null = todos (modo asistencia).
 */
export async function getCobrosDia(filtro: FiltroCobros): Promise<CobroDelDia[]> {
  if (USE_MOCK) {
    const db = getDb();
    const cobros = cobrosDeLaVentana(db, filtro.fecha)
      .filter((c) => (filtro.cobradorId == null ? true : c.cobradorAsignadoId === filtro.cobradorId))
      .filter((c) =>
        filtro.localidadId == null ? true : c.cliente.idLocalidad === filtro.localidadId
      );
    return delay(cobros);
  }
  const { data } = await api.get<CobroDelDia[]>("/cobros", { params: filtro });
  return data;
}

/**
 * Registra el pago con un click (pagado / adelanto / recargo / incomunicado).
 * Guarda quién cobró (asistencia si ≠ asignado) y si fue dentro de rango.
 */
export async function registrarPago(payload: RegistrarPagoPayload): Promise<CobroDelDia> {
  if (USE_MOCK) {
    const db = getDb();
    const pp = db.pagosPorRealizar.find((p) => p.id === payload.pagoId);
    if (!pp) throw new Error("Pago no encontrado.");

    const cobro = toCobroDelDia(db, pp);
    const asignadoId = cobro?.cobradorAsignadoId ?? payload.cobradorId;
    // Fuera de rango: lo cobró alguien distinto al asignado (asistencia)
    const dentroRango = payload.cobradorId === asignadoId;

    pp.estado = payload.estado;
    pp.dentroRango = dentroRango;

    // Incomunicado no genera pago realizado (no se cobró dinero)
    db.pagosRealizados = db.pagosRealizados.filter((pr) => pr.idPago !== pp.id);
    if (payload.estado !== "Incomunicado") {
      db.pagosRealizados.push({
        id: nextId(db.pagosRealizados),
        idPago: pp.id,
        idCobrador: payload.cobradorId,
        concepto: payload.concepto || CONCEPTO_POR_ESTADO[payload.estado],
        fechaDePago: todayISO(),
      });
    }
    saveDb();
    const actualizado = toCobroDelDia(db, pp);
    if (!actualizado) throw new Error("Cobro inconsistente.");
    return delay(actualizado);
  }
  const { data } = await api.patch<CobroDelDia>(`/cobros/${payload.pagoId}`, payload);
  return data;
}
