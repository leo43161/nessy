import { api, USE_MOCK } from "@/services/api";
import { delay, getDb, nextId, saveDb } from "@/services/mock/db";
import { aNota, type FilaNota } from "@/services/mapear";
import { getClientes } from "@/services/clientes.service";
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
  // `/notas` no lista la cartera entera: para el rol cobrador exige `id` o
  // `id_cliente` (si no, 400). Así que se piden las notas cliente por cliente.
  //
  // ponytail: un request por cliente. Con la cartera actual son dos; si crece,
  // hace falta que `/notas` acepte listar por cobrador — el SP ya podría
  // filtrarlo con el id del token, igual que hace `/clientes`.
  const clientes = await getClientes({ cobradorId, localidadId: null });

  const porCliente = await Promise.all(
    clientes.map(async (c) => {
      const notas = await getNotasDeCliente(c.id);
      return notas.map<NotaConCliente>((n) => ({ ...n, clienteNombre: c.nombreCompleto }));
    }),
  );

  return porCliente
    .flat()
    .sort((a, b) => b.fechaDeCreacion.localeCompare(a.fechaDeCreacion) || b.id - a.id);
}

/** Notas de un cliente puntual — lo que consume el detalle del cliente */
export async function getNotasDeCliente(clienteId: number): Promise<Nota[]> {
  if (USE_MOCK) {
    const db = getDb();
    return delay(
      db.notas
        .filter((n) => n.idCliente === clienteId)
        .slice()
        .sort((a, b) => b.fechaDeCreacion.localeCompare(a.fechaDeCreacion) || b.id - a.id),
    );
  }
  const { data } = await api.get<{ total: number; notas: FilaNota[] }>("/notas", {
    params: { id_cliente: clienteId },
  });
  return data.notas.map(aNota);
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
  // La API responde solo { id_Notas, id_Cliente }, no la nota entera, así que
  // se arma con lo que ya se mandó en vez de hacer un GET de vuelta.
  const { data } = await api.post<{ id_Notas: number; id_Cliente: number }>("/notas", {
    id_cliente: payload.clienteId,
    Nota: payload.contenido,
  });

  return {
    id: data.id_Notas,
    idCliente: payload.clienteId,
    nota: payload.contenido,
    fechaDeCreacion: todayISO(),
    fechaUltimaEdicion: null,
    clienteNombre: await nombreDeCliente(payload.clienteId),
  };
}

/** Nombre del cliente para mostrar junto a la nota. */
async function nombreDeCliente(clienteId: number): Promise<string> {
  const clientes = await getClientes({ cobradorId: null, localidadId: null });
  return clientes.find((c) => c.id === clienteId)?.nombreCompleto ?? "Cliente";
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
  // El id va en el body, no en la ruta: `/notas/7` intentaría llamar al
  // método "7" del controlador.
  await api.put<{ id_Notas: number }>("/notas", {
    id: payload.notaId,
    Nota: payload.contenido,
  });

  // El PUT devuelve solo el id, así que la nota se relee para recuperar
  // id_cliente y las fechas que actualizó la base.
  const { data } = await api.get<{ total: number; notas: FilaNota[] }>("/notas", {
    params: { id: payload.notaId },
  });

  const fila = data.notas[0];
  if (!fila) throw new Error("Nota no encontrada.");

  return { ...aNota(fila), clienteNombre: await nombreDeCliente(fila.id_cliente) };
}

export async function eliminarNota(notaId: number): Promise<number> {
  if (USE_MOCK) {
    const db = getDb();
    db.notas = db.notas.filter((n) => n.id !== notaId);
    saveDb();
    return delay(notaId);
  }
  // Soft delete (Activo = 0). El id va en el body, no en la ruta.
  await api.delete("/notas", { data: { id: notaId } });
  return notaId;
}
