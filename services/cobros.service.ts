import { api } from "@/services/api";
import {
  aClienteListado,
  aCuota,
  type FilaCliente,
  type FilaCuota,
  type FilaPersona,
} from "@/services/mapear";
import { addDays } from "@/lib/format";
import { VENTANA_FUTURO, VENTANA_PASADO } from "@/lib/constants";
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
  await api.post("/advertencias", {
    id_plan: payload.planId,
    Motivo: payload.motivo,
    Recargo: payload.recargo,
  });
}
