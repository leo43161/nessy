import { api, USE_MOCK } from "@/services/api";
import { COBRADORES, delay, getDb, nextId, saveDb } from "@/services/mock/db";
import { todayISO } from "@/lib/format";
import type {
  Cliente,
  ClienteResumen,
  NuevoCargoPayload,
  NuevoClientePayload,
  NuevoPagoPayload,
  Transaccion,
} from "@/types";

function toResumen(cliente: Cliente, cobradorId?: number): ClienteResumen {
  const db = getDb();
  const sched = db.schedules.find(
    (s) =>
      s.clienteId === cliente.id &&
      s.active &&
      (cobradorId === undefined || s.cobradorId === cobradorId)
  );
  const cobrador = sched ? COBRADORES.find((c) => c.id === sched.cobradorId) : null;
  return {
    ...cliente,
    pagoAcordado: sched?.pagoAcordado ?? null,
    frecuencia: sched?.frecuencia ?? null,
    cobradorNombre: cobrador?.nombre ?? null,
    totalCobrado: db.transacciones
      .filter((t) => t.clienteId === cliente.id && t.tipo === "PAGO")
      .reduce((sum, t) => sum + t.monto, 0),
  };
}

/** Clientes asignados a un cobrador, con su resumen de saldo */
export async function getClientes(cobradorId: number): Promise<ClienteResumen[]> {
  if (USE_MOCK) {
    const db = getDb();
    const misClientes = new Set(
      db.schedules.filter((s) => s.cobradorId === cobradorId && s.active).map((s) => s.clienteId)
    );
    const clientes = db.clientes
      .filter((c) => misClientes.has(c.id))
      .map((c) => toResumen(c, cobradorId));
    return delay(clientes);
  }
  const { data } = await api.get<ClienteResumen[]>("/clientes", { params: { cobradorId } });
  return data;
}

/** Detalle de un cliente para el modal de balance */
export async function getCliente(clienteId: number): Promise<ClienteResumen> {
  if (USE_MOCK) {
    const db = getDb();
    const cliente = db.clientes.find((c) => c.id === clienteId);
    if (!cliente) throw new Error("Cliente no encontrado.");
    return delay(toResumen(cliente), 150);
  }
  const { data } = await api.get<ClienteResumen>(`/clientes/${clienteId}`);
  return data;
}

/** Historial de transacciones (más recientes primero) */
export async function getTransacciones(clienteId: number): Promise<Transaccion[]> {
  if (USE_MOCK) {
    const db = getDb();
    const txs = db.transacciones
      .filter((t) => t.clienteId === clienteId)
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    return delay(txs, 250);
  }
  const { data } = await api.get<Transaccion[]>(`/clientes/${clienteId}/transacciones`);
  return data;
}

export async function crearCliente(payload: NuevoClientePayload): Promise<ClienteResumen> {
  if (USE_MOCK) {
    const db = getDb();
    const cliente: Cliente = {
      id: nextId(db.clientes),
      nombre: payload.nombre,
      telefono: payload.telefono,
      moneda: payload.moneda,
      estatus: payload.estatus,
      creado: todayISO(),
    };
    db.clientes.push(cliente);
    db.schedules.push({
      id: nextId(db.schedules),
      clienteId: cliente.id,
      cobradorId: payload.cobradorId,
      pagoAcordado: 0,
      frecuencia: "Diaria",
      status: "Active",
      active: true,
    });
    saveDb();
    return delay(toResumen(cliente, payload.cobradorId));
  }
  const { data } = await api.post<ClienteResumen>("/clientes", payload);
  return data;
}

/** Carga más financiación: registra el cargo y actualiza el esquema de pago */
export async function crearCargo(payload: NuevoCargoPayload): Promise<Transaccion> {
  if (USE_MOCK) {
    const db = getDb();
    const tx: Transaccion = {
      id: nextId(db.transacciones),
      clienteId: payload.clienteId,
      cobroId: null,
      tipo: "CARGO",
      concepto: payload.concepto || "Cargo",
      monto: payload.monto,
      fecha: todayISO(),
    };
    db.transacciones.push(tx);
    if (!payload.pagoContado && payload.pagoAcordado && payload.esquema) {
      const sched = db.schedules.find((s) => s.clienteId === payload.clienteId && s.active);
      if (sched) {
        sched.pagoAcordado = payload.pagoAcordado;
        sched.frecuencia = payload.esquema;
      }
    }
    saveDb();
    return delay(tx);
  }
  const { data } = await api.post<Transaccion>("/cargos", payload);
  return data;
}

export async function crearPago(payload: NuevoPagoPayload): Promise<Transaccion> {
  if (USE_MOCK) {
    const db = getDb();
    const tx: Transaccion = {
      id: nextId(db.transacciones),
      clienteId: payload.clienteId,
      cobroId: null,
      tipo: "PAGO",
      concepto: payload.concepto || "Pago",
      monto: payload.monto,
      fecha: todayISO(),
    };
    db.transacciones.push(tx);
    saveDb();
    return delay(tx);
  }
  const { data } = await api.post<Transaccion>("/pagos", payload);
  return data;
}
