import { api, USE_MOCK } from "@/services/api";
import { delay, getDb, nextId, saveDb } from "@/services/mock/db";
import { todayISO } from "@/lib/format";
import type { EditarNotaPayload, Nota, NuevaNotaPayload } from "@/types";

export interface NotaConCliente extends Nota {
  clienteNombre: string;
}

function conNombre(nota: Nota): NotaConCliente {
  const db = getDb();
  return {
    ...nota,
    clienteNombre: db.clientes.find((c) => c.id === nota.idCliente)?.nombreCompleto ?? "Cliente",
  };
}

/** Notas sobre los clientes del cobrador (más recientes primero) */
export async function getNotas(cobradorId: number): Promise<NotaConCliente[]> {
  if (USE_MOCK) {
    const db = getDb();
    const misClientes = new Set(
      db.clienteCobrador.filter((cc) => cc.idCobrador === cobradorId).map((cc) => cc.idCliente)
    );
    const notas = db.notas
      .filter((n) => misClientes.has(n.idCliente))
      .slice()
      .sort((a, b) => b.fechaDeCreacion.localeCompare(a.fechaDeCreacion) || b.id - a.id)
      .map(conNombre);
    return delay(notas);
  }
  const { data } = await api.get<NotaConCliente[]>("/notas", { params: { cobradorId } });
  return data;
}

export async function crearNota(payload: NuevaNotaPayload): Promise<NotaConCliente> {
  if (USE_MOCK) {
    const db = getDb();
    const nota: Nota = {
      id: nextId(db.notas),
      idCliente: payload.clienteId,
      nota: payload.contenido,
      fechaDeCreacion: todayISO(),
      fechaUltimaEdicion: null,
    };
    db.notas.push(nota);
    saveDb();
    return delay(conNombre(nota));
  }
  const { data } = await api.post<NotaConCliente>("/notas", payload);
  return data;
}

export async function editarNota(payload: EditarNotaPayload): Promise<NotaConCliente> {
  if (USE_MOCK) {
    const db = getDb();
    const nota = db.notas.find((n) => n.id === payload.notaId);
    if (!nota) throw new Error("Nota no encontrada.");
    nota.nota = payload.contenido;
    nota.fechaUltimaEdicion = todayISO();
    saveDb();
    return delay(conNombre(nota));
  }
  const { data } = await api.put<NotaConCliente>(`/notas/${payload.notaId}`, payload);
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
