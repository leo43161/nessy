import { fmtMoney, formatFecha } from "@/lib/format";
import { APP_NAME } from "@/lib/constants";
import type { EstadoDeCuenta } from "@/types";

/** Arma el estado de cuenta como texto plano para compartir (WhatsApp, etc.) */
export function estadoDeCuentaToText(ec: EstadoDeCuenta): string {
  const lineas: string[] = [];
  lineas.push(`*${APP_NAME} — Estado de Cuenta*`);
  lineas.push(`Cliente: ${ec.clienteNombre}`);
  lineas.push(`Fecha: ${formatFecha(ec.generadoEl)}`);
  lineas.push("");

  for (const plan of ec.planes) {
    lineas.push(`*${plan.nombre}* (${plan.status})`);
    lineas.push(`  Cuotas: ${plan.cuotasPagadas}/${plan.cuotasTotales}`);
    lineas.push(`  Pagado: ${fmtMoney(plan.pagado)}`);
    lineas.push(`  Pendiente: ${fmtMoney(plan.pendiente)}`);
    if (plan.vencido > 0) lineas.push(`  Vencido: ${fmtMoney(plan.vencido)}`);
    if (plan.proximaCuota) {
      lineas.push(
        `  Próxima cuota: ${fmtMoney(plan.proximaCuota.monto)} el ${formatFecha(plan.proximaCuota.fecha)}`
      );
    }
    lineas.push("");
  }

  lineas.push(`*Total pagado:* ${fmtMoney(ec.totalPagado)}`);
  lineas.push(`*Saldo pendiente:* ${fmtMoney(ec.saldoPendiente)}`);
  if (ec.totalVencido > 0) lineas.push(`*Total vencido:* ${fmtMoney(ec.totalVencido)}`);

  return lineas.join("\n");
}
