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
import { CONCEPTO_POR_TIPO, tipoDeCobro } from "@/lib/status";
import type {
  ClienteListado,
  CobroDelDia,
  FiltroCobros,
  RegistrarAdvertenciaPayload,
  RegistrarPagoPayload,
} from "@/types";

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
 * Registra el cobro. La cuota queda `Pagado` cobre lo que cobre: cuánto entró
 * se ve en el monto abonado, no en el estado (decisión N.4).
 */
export async function registrarPago(payload: RegistrarPagoPayload): Promise<CobroDelDia> {
  if (USE_MOCK) {
    const db = getDb();
    const pp = db.pagosPorRealizar.find((p) => p.id === payload.pagoId);
    if (!pp) throw new Error("Pago no encontrado.");

    const tipo = tipoDeCobro(payload.monto, pp.montoEsperado);

    pp.estado = "Pagado";
    // El mock no tiene el domicilio del cliente para medir los 2 km, así que
    // se aproxima con "vino con ubicación". La cuenta real la hace el SP.
    pp.dentroRango = payload.lat != null && payload.lon != null;

    // El cobro parcial cobra lo que entró y deja una cuota nueva por la
    // diferencia, con la fecha pactada. Es lo que hace sp_PagoParcial.
    if (tipo === "parcial" && payload.nuevaFecha) {
      db.pagosPorRealizar.push({
        ...pp,
        id: nextId(db.pagosPorRealizar),
        montoEsperado: pp.montoEsperado - payload.monto,
        fechaAcordada: payload.nuevaFecha,
        estado: "Pendiente",
        dentroRango: null,
      });
    }

    db.pagosRealizados = db.pagosRealizados.filter((pr) => pr.idPago !== pp.id);
    db.pagosRealizados.push({
      id: nextId(db.pagosRealizados),
      idPago: pp.id,
      idCobrador: payload.cobradorId,
      concepto: payload.concepto || CONCEPTO_POR_TIPO[tipo],
      fechaDePago: todayISO(),
    });

    saveDb();
    const actualizado = toCobroDelDia(db, pp);
    if (!actualizado) throw new Error("Cobro inconsistente.");
    return delay(actualizado);
  }
  // Un solo POST para los tres SP de cobro: el tipo lo deduce la API del
  // monto (igual / menor / mayor al esperado), así el front no puede elegir
  // mal. El id de la cuota va en el body: este router no tiene path params.
  const { data } = await api.post<{
    tipo: string;
    id_cuota: number;
    sin_ubicacion: boolean;
  }>("/cobros", {
    id_cuota: payload.pagoId,
    monto: payload.monto,
    id_metodo_de_pago: payload.idMetodoDePago,
    // El SP del cobro parcial crea una cuota nueva por la diferencia con esta
    // fecha; en los otros dos casos la API lo ignora.
    nueva_fecha: payload.nuevaFecha,
    concepto: payload.concepto,
    // Sin ubicación la API responde sin_ubicacion:true y deja Dentro_Rango en
    // 0. Nunca rechaza el cobro por eso (N.5).
    lat: payload.lat ?? undefined,
    lon: payload.lon ?? undefined,
  });

  // La respuesta trae la cuota actualizada pero no el cliente ni el plan
  // cruzados, así que se relee la cuota ya armada.
  const cuotas = await getHistorico();
  const actualizada = cuotas.find((c) => c.id === data.id_cuota);
  if (!actualizada) throw new Error("El cobro se registró pero no se pudo releer la cuota.");
  return actualizada;
}

/**
 * Registra una advertencia sobre el plan — es lo que reemplaza al viejo estado
 * "Incomunicado" (decisión N.4).
 *
 * Cuelga del plan, no de la cuota, y no toca `Pagos_por_realizar.Estado`: la
 * cuota sigue pendiente. Si lleva recargo, `/estado_cuenta` lo devuelve como
 * un movimiento propio y lo suma al saldo (N.2).
 */
export async function registrarAdvertencia(
  payload: RegistrarAdvertenciaPayload,
): Promise<void> {
  if (USE_MOCK) {
    await delay(null, 300);
    return;
  }
  await api.post("/advertencias", {
    id_plan: payload.planId,
    Motivo: payload.motivo,
    Recargo: payload.recargo,
  });
}
