import { api, USE_MOCK } from "@/services/api";
import { delay, getDb, nextId, saveDb } from "@/services/mock/db";
import { todayISO } from "@/lib/format";
import type { Nota, NuevaNotaPayload } from "@/types";

/** Notas sobre los clientes del cobrador (más recientes primero) */
export async function getNotas(cobradorId: number): Promise<Nota[]> {
  if (USE_MOCK) {
    const db = getDb();
    const misClientes = new Set(
      db.schedules.filter((s) => s.cobradorId === cobradorId).map((s) => s.clienteId)
    );
    const notas = db.notas
      .filter((n) => misClientes.has(n.clienteId))
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    return delay(notas);
  }
  const { data } = await api.get<Nota[]>("/notas", { params: { cobradorId } });
  return data;
}

export async function crearNota(payload: NuevaNotaPayload): Promise<Nota> {
  if (USE_MOCK) {
    const db = getDb();
    const cliente = db.clientes.find((c) => c.id === payload.clienteId);
    const nota: Nota = {
      id: nextId(db.notas),
      clienteId: payload.clienteId,
      clienteNombre: cliente?.nombre ?? "Cliente",
      contenido: payload.contenido,
      fecha: todayISO(),
    };
    db.notas.push(nota);
    saveDb();
    return delay(nota);
  }
  const { data } = await api.post<Nota>("/notas", payload);
  return data;
}

export async function eliminarNota(notaId: number): Promise<number> {
  if (USE_MOCK) {
    const db = getDb();
    db.notas = db.notas.filter((n) => n.id !== notaId);
    saveDb();
    return delay(notaId);
  }
  await api.delete(`/notas/${notaId}`);
  return notaId;
}
