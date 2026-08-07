import { api } from "@/services/api";
import {
  aCliente,
  aClienteListado,
  aEstadoDeCuenta,
  aReferenteDeCliente,
  aTelefonos,
  type FilaCliente,
  type RespuestaEstadoCuenta,
} from "@/services/mapear";
import { getNotasDeCliente } from "@/services/notas.service";
import { todayISO } from "@/lib/format";
import type {
  ClienteDetalle,
  ClienteListado,
  EstadoDeCuenta,
  FiltroClientes,
} from "@/types";

/** Clientes según filtros (cobrador null = todos) */
export async function getClientes(filtro: FiltroClientes): Promise<ClienteListado[]> {
  // La API ya recorta por cartera: para el rol cobrador, `/clientes` devuelve
  // solo los suyos usando el id_Cobrador del token. Los filtros de la UI no
  // los soporta todavía (tarea C.2), así que se aplican acá.
  const { data } = await api.get<{ total: number; clientes: FilaCliente[] }>("/clientes");

  return data.clientes
    .map((f) => aClienteListado(f))
    .filter((c) => filtro.localidadId == null || c.idLocalidad === filtro.localidadId);
}

/** Detalle completo para el modal de cliente */
export async function getClienteDetalle(clienteId: number): Promise<ClienteDetalle> {
  // `/clientes/105` NO existe: este router lee el segundo segmento como nombre
  // de método, así que responde "Método '105' no encontrado". El id va por
  // query string.
  //
  // /estado_cuenta ya devuelve cliente, teléfonos, referentes y movimientos en
  // un solo request, así que el detalle se arma casi entero desde ahí; solo la
  // localidad y las notas salen aparte.
  const [resEstado, resCliente, notas] = await Promise.all([
    api.get<RespuestaEstadoCuenta>("/estado_cuenta", { params: { id_cliente: clienteId } }),
    api.get<{ total: number; clientes: FilaCliente[] }>("/clientes", {
      params: { id: clienteId },
    }),
    getNotasDeCliente(clienteId),
  ]);

  const fila = resCliente.data.clientes[0];
  if (!fila) throw new Error("Cliente no encontrado.");

  return {
    cliente: aCliente(fila),
    localidadNombre: fila.nombre_localidad ?? null,
    telefonos: aTelefonos(fila.telefonos ?? resEstado.data.telefonos),
    // `/clientes` no devuelve el cobrador asignado y la cartera se pide por
    // cobrador. En esta app el cobrador logueado es el asignado salvo en modo
    // asistencia, así que no vale un request extra.
    cobradorAsignadoNombre: null,
    referentes: resEstado.data.referentes.map(aReferenteDeCliente),
    notas,
    estadoDeCuenta: aEstadoDeCuenta(resEstado.data, todayISO()),
  };
}

/** Estado de cuenta del cliente (para compartir tras cobrar) */
export async function getEstadoDeCuenta(clienteId: number): Promise<EstadoDeCuenta> {
  // El endpoint es /estado_cuenta?id_cliente=N, no una subruta de /clientes.
  const { data } = await api.get<RespuestaEstadoCuenta>("/estado_cuenta", {
    params: { id_cliente: clienteId },
  });
  return aEstadoDeCuenta(data, todayISO());
}
