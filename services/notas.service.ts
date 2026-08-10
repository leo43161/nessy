import { api } from "@/services/api";
import { aNota, type FilaNota } from "@/services/mapear";
import { getClientes } from "@/services/clientes.service";
import { todayISO } from "@/lib/format";
import type { EditarNotaPayload, Nota, NuevaNotaPayload } from "@/types";

export interface NotaConCliente extends Nota {
  clienteNombre: string;
}

/** Notas sobre los clientes del cobrador (más recientes primero) */
export async function getNotas(cobradorId: number): Promise<NotaConCliente[]> {
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
  const { data } = await api.get<{ total: number; notas: FilaNota[] }>("/notas", {
    params: { id_cliente: clienteId },
  });
  return data.notas.map(aNota);
}

export async function crearNota(payload: NuevaNotaPayload): Promise<NotaConCliente> {
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

  return { ...aNota(fila), clienteNombre: await nombreDeCliente(fila.id_Cliente) };
}

export async function eliminarNota(notaId: number): Promise<number> {
  // Soft delete (Activo = 0). El id va en el body, no en la ruta.
  await api.delete("/notas", { data: { id: notaId } });
  return notaId;
}
