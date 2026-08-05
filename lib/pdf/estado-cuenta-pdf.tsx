import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { APP_NAME } from "@/lib/constants";
import { fmtMoney, formatFecha } from "@/lib/format";
import { esCobrado } from "@/lib/status";
import type { EstadoDeCuenta, EstadoDeCuentaPlan } from "@/types";

/** Datos del cliente que no vienen en EstadoDeCuenta pero sí en el encabezado */
export interface EstadoCuentaPdfCliente {
  nombreCompleto: string;
  dni: string;
  direccion: string | null;
  localidadNombre: string | null;
  codigoPostal?: string | null;
}

/**
 * Mensaje institucional del bloque superior (el banco pone su promo acá).
 * Viene de Plantillas_de_mensaje.Mensaje; esto es el fallback hasta que exista la API.
 */
const LEYENDA_DEFAULT =
  "Gracias por mantener tu plan al día.\nAnte cualquier consulta, comunicate con tu cobrador asignado.";

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 54,
    paddingHorizontal: 34,
    fontFamily: "Courier",
    fontSize: 7,
    color: "#000",
  },

  // ── Encabezado ──
  logo: { fontFamily: "Helvetica-Bold", fontSize: 19, color: "#0d4f8b", letterSpacing: -0.4 },
  paginaBox: { position: "absolute", top: 34, right: 34, alignItems: "flex-end" },
  paginaLabel: { fontSize: 7 },

  destinatario: { marginTop: 46, flexDirection: "row", justifyContent: "space-between" },
  srEs: { fontSize: 7 },
  bloqueDir: { marginLeft: 28, marginTop: 2 },
  nombreDest: { fontFamily: "Courier-BoldOblique", fontSize: 8.5 },
  lineaDir: { fontFamily: "Courier-BoldOblique", fontSize: 8.5 },
  docLinea: { marginTop: 6, marginLeft: 10, fontSize: 7 },

  rule: { borderBottomWidth: 0.8, borderBottomColor: "#000" },
  ruleFina: { borderBottomWidth: 0.5, borderBottomColor: "#000" },

  leyenda: { marginVertical: 14, alignItems: "center" },
  leyendaTxt: { fontFamily: "Courier-Bold", fontSize: 7.5, textAlign: "center", lineHeight: 1.5 },

  // ── Barra de estado de cuenta ──
  barra: { flexDirection: "row", marginTop: 10, marginBottom: 8 },
  barraTxt: { fontSize: 6.6 },

  // ── Cabecera de plan ──
  planTitulo: { marginTop: 10, fontSize: 6.8 },
  resumenHead: { flexDirection: "row", marginTop: 7 },
  resumenRow: { flexDirection: "row", marginTop: 2 },
  planRef: { marginTop: 9, fontSize: 6.6 },

  // ── Tabla de movimientos ──
  tablaHead: { flexDirection: "row", marginTop: 8, marginBottom: 3 },
  fila: { flexDirection: "row", paddingVertical: 0.9 },
  cFecha: { width: "10%" },
  cConcepto: { width: "31%" },
  cCuota: { width: "7%", textAlign: "right", paddingRight: 6 },
  cVenc: { width: "11%" },
  cDebito: { width: "13.5%", textAlign: "right" },
  cCredito: { width: "13.5%", textAlign: "right" },
  cSaldo: { width: "14%", textAlign: "right" },

  // ── Totales ──
  totales: { marginTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  totalLabel: { fontFamily: "Courier-Bold", fontSize: 7.2, width: 150, textAlign: "right" },
  totalValor: { fontFamily: "Courier-Bold", fontSize: 7.2, width: 95, textAlign: "right" },
  vencido: { color: "#a11" },

  // ── Pie ──
  footer: {
    position: "absolute",
    bottom: 22,
    left: 34,
    right: 34,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.2,
    textAlign: "center",
    color: "#000",
    lineHeight: 1.45,
  },
});

/** "2026-07-28" → "28/07/26" (formato compacto de la tabla, como el resumen bancario) */
function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Referencia del comprobante: "4897C20260728" (cliente + fecha de emisión) */
function comprobante(ec: EstadoDeCuenta): string {
  return `${ec.clienteId}C${ec.generadoEl.slice(0, 10).replace(/-/g, "")}`;
}

/** Importe sin el "$": la columna ya está rotulada. "45000" → "45.000,00" */
function num(monto: number): string {
  return fmtMoney(monto).replace("$ ", "");
}

/**
 * Movimientos del plan como asiento contable con saldo corrido, al estilo del
 * resumen bancario: el plan nace como débito por el monto total y cada cobro
 * lo acredita. El saldo final coincide con `plan.pendiente`.
 */
interface Asiento {
  fecha: string;
  concepto: string;
  cuota: string;
  vencimiento: string;
  debito: number | null;
  credito: number | null;
  saldo: number;
}

function asientosDelPlan(plan: EstadoDeCuentaPlan): Asiento[] {
  const filas: Asiento[] = [
    {
      fecha: "00/00/00",
      concepto: "SALDO ANTERIOR",
      cuota: "",
      vencimiento: "",
      debito: null,
      credito: null,
      saldo: 0,
    },
    {
      fecha: fechaCorta(plan.movimientos[plan.movimientos.length - 1]?.fecha),
      concepto: `ALTA PLAN ${plan.nombre.toUpperCase()}`,
      cuota: "",
      vencimiento: "",
      debito: plan.montoTotal,
      credito: null,
      saldo: plan.montoTotal,
    },
  ];

  let saldo = plan.montoTotal;
  // La API los entrega del más nuevo al más viejo; el extracto va cronológico.
  const cronologico = [...plan.movimientos].reverse();

  cronologico.forEach((m, i) => {
    // Un movimiento de Recargo es un débito (una advertencia con monto), no
    // un crédito: nunca resta del saldo.
    const cobrado = m.estado === "Pagado";
    if (cobrado) saldo -= m.monto;
    filas.push({
      fecha: fechaCorta(m.fecha),
      concepto: m.concepto.toUpperCase(),
      cuota: String(i + 1),
      vencimiento: fechaCorta(m.fecha),
      debito: null,
      credito: cobrado ? m.monto : null,
      saldo,
    });
  });

  if (plan.proximaCuota) {
    filas.push({
      fecha: "",
      concepto: "PROXIMA CUOTA A VENCER",
      cuota: String(plan.cuotasPagadas + 1),
      vencimiento: fechaCorta(plan.proximaCuota.fecha),
      debito: plan.proximaCuota.monto,
      credito: null,
      saldo,
    });
  }

  return filas;
}

function PlanSection({ plan }: { plan: EstadoDeCuentaPlan }) {
  const filas = asientosDelPlan(plan);

  return (
    <View>
      <Text style={styles.planTitulo}>
        PLAN DE PAGOS - {plan.nombre.toUpperCase()} - {plan.status.toUpperCase()}
      </Text>

      {/* Cabecera de cuenta: PLAN / CUOTAS / MDA / SALDO */}
      <View style={styles.resumenHead}>
        <Text style={{ width: "10%" }}>PLAN</Text>
        <Text style={{ width: "12%" }}>CUOTAS</Text>
        <Text style={{ width: "8%" }}>MDA</Text>
        <Text style={{ width: "20%", textAlign: "right" }}>SALDO</Text>
      </View>
      <View style={styles.resumenRow}>
        <Text style={{ width: "10%" }}>{plan.planId}</Text>
        <Text style={{ width: "12%" }}>
          {plan.cuotasPagadas}/{plan.cuotasTotales}
        </Text>
        <Text style={{ width: "8%" }}>$</Text>
        <Text style={{ width: "20%", textAlign: "right" }}>{num(plan.pendiente)}</Text>
      </View>

      <Text style={styles.planRef}>
        PLAN Nº {plan.planId} MONTO TOTAL: {num(plan.montoTotal)} CUOTAS: {plan.cuotasTotales}
        {plan.vencido > 0 ? `  VENCIDO: ${num(plan.vencido)}` : ""}
      </Text>

      {/* ponytail: si un plan supera ~45 cuotas la tabla se parte y la 2da página
          queda sin esta cabecera. `fixed` no sirve: la repite en todas las páginas,
          incluso sobre planes que ya traen la suya. Si aparecen planes tan largos,
          paginar los movimientos a mano por alto de página. */}
      <View style={styles.tablaHead}>
        <Text style={styles.cFecha}>FECHA</Text>
        <Text style={styles.cConcepto}>CONCEPTO</Text>
        <Text style={styles.cCuota}>CUOTA</Text>
        <Text style={styles.cVenc}>VENCIM.</Text>
        <Text style={styles.cDebito}>DEBITOS</Text>
        <Text style={styles.cCredito}>CREDITOS</Text>
        <Text style={styles.cSaldo}>SALDO</Text>
      </View>

      {filas.map((f, i) => (
        <View key={i} style={styles.fila} wrap={false}>
          <Text style={styles.cFecha}>{f.fecha}</Text>
          <Text style={styles.cConcepto}>{f.concepto}</Text>
          <Text style={styles.cCuota}>{f.cuota}</Text>
          <Text style={styles.cVenc}>{f.vencimiento}</Text>
          <Text style={styles.cDebito}>{f.debito == null ? "" : num(f.debito)}</Text>
          <Text style={styles.cCredito}>{f.credito == null ? "" : num(f.credito)}</Text>
          <Text style={styles.cSaldo}>{num(f.saldo)}</Text>
        </View>
      ))}
    </View>
  );
}

export function EstadoCuentaDocument({
  ec,
  cliente,
  leyenda = LEYENDA_DEFAULT,
}: {
  ec: EstadoDeCuenta;
  cliente: EstadoCuentaPdfCliente;
  /** Plantillas_de_mensaje.Mensaje — una línea por salto de línea */
  leyenda?: string;
}) {
  const domicilio = [cliente.codigoPostal, cliente.localidadNombre].filter(Boolean).join(" ");
  const lineasLeyenda = leyenda.split("\n").filter((l) => l.trim() !== "");

  return (
    <Document
      title={`Estado de cuenta ${cliente.nombreCompleto}`}
      author={APP_NAME}
      subject="Estado de cuenta unificado"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.logo}>{APP_NAME.toUpperCase()}</Text>

        <View style={styles.paginaBox} fixed>
          <Text
            style={styles.paginaLabel}
            render={({ pageNumber }) => `Página:      ${pageNumber}`}
          />
          <Text style={{ fontSize: 7, marginTop: 30 }}>{ec.clienteId}</Text>
        </View>

        {/* Destinatario */}
        <View style={styles.destinatario}>
          <View>
            <Text style={styles.srEs}>SR. (ES)</Text>
            <View style={styles.bloqueDir}>
              <Text style={styles.nombreDest}>{cliente.nombreCompleto.toUpperCase()}</Text>
              {cliente.direccion && (
                <Text style={styles.lineaDir}>{cliente.direccion.toUpperCase()}</Text>
              )}
              {domicilio !== "" && <Text style={styles.lineaDir}>{domicilio.toUpperCase()}</Text>}
            </View>
            <Text style={styles.docLinea}>
              D.N.I. {cliente.dni}  {cliente.nombreCompleto.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 24 }} />
        <View style={styles.rule} />

        {/* Leyenda institucional */}
        <View style={styles.leyenda}>
          {lineasLeyenda.map((l, i) => (
            <Text key={i} style={styles.leyendaTxt}>
              {l}
            </Text>
          ))}
        </View>

        <View style={styles.rule} />

        <View style={styles.barra}>
          <Text style={styles.barraTxt}>
            ESTADO DE CUENTAS UNIFICADO    CLIENTE Nº: {ec.clienteId}    AL{" "}
            {fechaCorta(ec.generadoEl)}    {comprobante(ec)}
          </Text>
        </View>

        <View style={styles.ruleFina} />

        {ec.planes.length === 0 ? (
          <Text style={{ marginTop: 12 }}>SIN PLANES DE PAGO REGISTRADOS.</Text>
        ) : (
          ec.planes.map((plan) => <PlanSection key={plan.planId} plan={plan} />)
        )}

        {/* Totales */}
        <View style={styles.totales}>
          <View style={styles.ruleFina} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL PAGADO</Text>
            <Text style={styles.totalValor}>{num(ec.totalPagado)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>SALDO PENDIENTE</Text>
            <Text style={styles.totalValor}>{num(ec.saldoPendiente)}</Text>
          </View>
          {ec.totalVencido > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, styles.vencido]}>TOTAL VENCIDO</Text>
              <Text style={[styles.totalValor, styles.vencido]}>{num(ec.totalVencido)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Este documento es un detalle informativo de tu plan de pagos y no constituye comprobante
          fiscal.{"\n"}
          Emitido por {APP_NAME} el {formatFecha(ec.generadoEl)}. Ante diferencias, consultá con tu
          cobrador asignado.
        </Text>
      </Page>
    </Document>
  );
}

/** Genera el PDF y dispara la descarga en el navegador */
export async function descargarEstadoCuentaPdf(
  ec: EstadoDeCuenta,
  cliente: EstadoCuentaPdfCliente,
  leyenda?: string
): Promise<void> {
  const blob = await pdf(
    <EstadoCuentaDocument ec={ec} cliente={cliente} leyenda={leyenda} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `estado-cuenta-${cliente.dni}-${ec.generadoEl}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
