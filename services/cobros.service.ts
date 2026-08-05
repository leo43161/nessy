import { api, USE_MOCK } from "@/services/api";
import {
  VENTANA_FUTURO,
  VENTANA_PASADO,
  cobrosDeLaVentana,
  delay,
  getDb,
  nextId,
  saveDb,
  toCobroDelDia,
} from "@/services/mock/db";
import {
  aClienteListado,
  aCuota,
  type FilaCliente,
  type FilaCuota,
  type FilaPersona,
} from "@/services/mapear";
import { addDays, todayISO } from "@/lib/format";
import { CONCEPTO_POR_ESTADO } from "@/lib/status";
import type { ClienteListado, CobroDelDia, FiltroCobros, RegistrarPagoPayload } from "@/types";

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
  // OJO: no es `/cobros`. Ese endpoint devuelve los cobros ya *hechos*
  // (Pagos_realizados); el worklist necesita las cuotas *a cobrar*, que es
  // `/cuotas` sobre Pagos_por_realizar.
  //
  // El alcance por cobrador lo resuelve la API con el id_Cobrador del token e
  // ignora el del request para ese rol, así que `cobradorId` acá solo sirve
  // para el modo asistencia de un admin.
  const rango = {
    desde: addDays(-VENTANA_PASADO, filtro.fecha),
    hasta: addDays(VENTANA_FUTURO, filtro.fecha),
  };

  const [res, ctx] = await Promise.all([
    api.get<{ total: number; cuotas: FilaCuota[] }>("/cuotas", { params: rango }),
    cargarContexto(),
  ]);

  return res.data.cuotas
    .map((f) => aCuota(f, ctx.clientes, ctx.cobradores))
    .filter((c) => filtro.cobradorId == null || c.cobradorAsignadoId === filtro.cobradorId)
    .filter((c) => filtro.localidadId == null || c.cliente.idLocalidad === filtro.localidadId);
}

/**
 * Todas las cuotas de la cartera, sin filtro de fecha — lo que consumen las
 * estadísticas.
 *
 * `/cuotas` exige un rango y no tiene modo "todo": sin `desde`/`hasta` cae a
 * hoy..hoy y devuelve vacío. Por eso el rango tope.
 */
export async function getHistorico(): Promise<CobroDelDia[]> {
  if (USE_MOCK) {
    const db = getDb();
    return delay(
      db.pagosPorRealizar.map((pp) => toCobroDelDia(db, pp)).filter((c): c is CobroDelDia => !!c),
    );
  }
  const [res, ctx] = await Promise.all([
    api.get<{ total: number; cuotas: FilaCuota[] }>("/cuotas", {
      params: { desde: "2000-01-01", hasta: "2099-12-31" },
    }),
    cargarContexto(),
  ]);
  return res.data.cuotas.map((f) => aCuota(f, ctx.clientes, ctx.cobradores));
}

/**
 * Clientes y cobradores indexados por id.
 *
 * `/cuotas` trae del cliente solo nombre, DNI, dirección y ubicación, pero la
 * UI también lee status, teléfonos y localidad; y del cobro trae el id de
 * quién cobró pero no su nombre.
 *
 * ponytail: se piden en cada consulta. Con la cartera actual son dos requests
 * de nada; si crece, cachearlos por sesión o pedirle al backend que `/cuotas`
 * devuelva esas columnas ya cruzadas.
 */
async function cargarContexto(): Promise<{
  clientes: Map<number, ClienteListado>;
  cobradores: Map<number, string>;
}> {
  const [resClientes, resCobradores] = await Promise.all([
    api.get<{ total: number; clientes: FilaCliente[] }>("/clientes"),
    api.get<{ total: number; cobradores: FilaPersona[] }>("/cobradores"),
  ]);

  return {
    clientes: new Map(resClientes.data.clientes.map((f) => [f.id_Clientes, aClienteListado(f)])),
    cobradores: new Map(
      resCobradores.data.cobradores.map((f) => [f.id_Cobradores ?? 0, f.Nombre_completo ?? "—"]),
    ),
  };
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
  // TODO fase B — registrar el cobro contra la API necesita tres cosas que el
  // front todavía no modela, y ninguna es de cableado:
  //
  //   N.6  `id_metodo_de_pago` es OBLIGATORIO en POST /cobros. La lista sale
  //        de getMetodosDePago(); falta el selector en registro-dialog.
  //   N.6  el cobro parcial manda `monto` < esperado y `nueva_fecha`. Hoy el
  //        registro es de un click y no pregunta monto.
  //   N.5  `lat`/`lon` son opcionales pero definen `Dentro_Rango` (≤ 2 km del
  //        domicilio). Sin ellos todo cobro queda en 0 y la función se muere
  //        sin usarse. Falta pedir geolocalización.
  //
  // Además el endpoint es POST /cobros con `id_cuota` en el body, no
  // PATCH /cobros/{id}: este router no tiene path params.
  throw new Error(
    "Registrar el cobro contra la API está pendiente (fase B: método de pago, " +
      "monto parcial y geolocalización). Por ahora corré con NEXT_PUBLIC_USE_MOCK=true.",
  );
}
