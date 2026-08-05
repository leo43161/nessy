import { api, USE_MOCK } from "@/services/api";
import {
  buildEstadoDeCuenta,
  delay,
  getDb,
  getLocalidadNombre,
  getTelefonos,
  toClienteListado,
} from "@/services/mock/db";
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
  ReferenteDeCliente,
} from "@/types";

/** Clientes según filtros (cobrador null = todos) */
export async function getClientes(filtro: FiltroClientes): Promise<ClienteListado[]> {
  if (USE_MOCK) {
    const db = getDb();
    const clientes = db.clientes
      .filter((c) => {
        if (filtro.cobradorId == null) return true;
        return db.clienteCobrador.some(
          (cc) => cc.idCliente === c.id && cc.idCobrador === filtro.cobradorId
        );
      })
      .filter((c) => (filtro.localidadId == null ? true : c.idLocalidad === filtro.localidadId))
      .map((c) => toClienteListado(db, c));
    return delay(clientes);
  }
  // La API ya recorta por cartera: para el rol cobrador, `/clientes` devuelve
  // solo los suyos usando el id_Cobrador del token. Los filtros de la UI no
  // los soporta todavía (tarea C.2), así que se aplican acá.
  const { data } = await api.get<{ total: number; clientes: FilaCliente[] }>("/clientes");

  return data.clientes
    .map((f) => aClienteListado(f))
    .filter((c) => filtro.localidadId == null || c.idLocalidad === filtro.localidadId);
}

/** Referentes del cliente: de la tabla Referentes + clientes que lo referencian */
function getReferentesDeCliente(clienteId: number): ReferenteDeCliente[] {
  const db = getDb();
  const desdeTabla: ReferenteDeCliente[] = db.referenteCliente
    .filter((rc) => rc.idCliente === clienteId)
    .map((rc) => db.referentes.find((r) => r.id === rc.idReferente))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      tipo: "Referente",
      id: r.id,
      dni: r.dni,
      nombreCompleto: r.nombreCompleto,
      direccion: r.direccion,
      localidadNombre: getLocalidadNombre(db, r.idLocalidad),
      telefonos: getTelefonos(db, "Referentes", r.id),
    }));

  const desdeClientes: ReferenteDeCliente[] = db.clienteClienteReferente
    .filter((cr) => cr.idTitular === clienteId)
    .map((cr) => db.clientes.find((c) => c.id === cr.idReferente))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({
      tipo: "Cliente",
      id: c.id,
      dni: c.dni,
      nombreCompleto: c.nombreCompleto,
      direccion: c.direccion,
      localidadNombre: getLocalidadNombre(db, c.idLocalidad),
      telefonos: getTelefonos(db, "Clientes", c.id),
    }));

  return [...desdeTabla, ...desdeClientes];
}

/** Detalle completo para el modal de cliente */
export async function getClienteDetalle(clienteId: number): Promise<ClienteDetalle> {
  if (USE_MOCK) {
    const db = getDb();
    const cliente = db.clientes.find((c) => c.id === clienteId);
    if (!cliente) throw new Error("Cliente no encontrado.");
    const cobrador = db.clienteCobrador.find((cc) => cc.idCliente === clienteId);
    const detalle: ClienteDetalle = {
      cliente,
      localidadNombre: getLocalidadNombre(db, cliente.idLocalidad),
      telefonos: getTelefonos(db, "Clientes", clienteId),
      cobradorAsignadoNombre:
        db.cobradores.find((c) => c.id === cobrador?.idCobrador)?.nombreCompleto ?? null,
      referentes: getReferentesDeCliente(clienteId),
      notas: db.notas
        .filter((n) => n.idCliente === clienteId)
        .sort((a, b) => b.fechaDeCreacion.localeCompare(a.fechaDeCreacion) || b.id - a.id),
      estadoDeCuenta: buildEstadoDeCuenta(db, clienteId),
    };
    return delay(detalle, 250);
  }
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
  if (USE_MOCK) {
    return delay(buildEstadoDeCuenta(getDb(), clienteId), 200);
  }
  // El endpoint es /estado_cuenta?id_cliente=N, no una subruta de /clientes.
  const { data } = await api.get<RespuestaEstadoCuenta>("/estado_cuenta", {
    params: { id_cliente: clienteId },
  });
  return aEstadoDeCuenta(data, todayISO());
}
