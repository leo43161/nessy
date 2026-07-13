// ════════════════════════════════════════════════════════════════
//  BACKEND MOCK
//  Simula la API mientras se desarrolla. Los datos se generan
//  relativos a la fecha actual (así siempre hay cobros "de hoy")
//  y se persisten en localStorage. Se re-generan al cambiar de día.
// ════════════════════════════════════════════════════════════════
import { MOCK_DB_KEY } from "@/lib/constants";
import { addDays, todayISO } from "@/lib/format";
import type {
  Cliente,
  Cobrador,
  CobroDia,
  CobroStatus,
  Frecuencia,
  Nota,
  PaymentSchedule,
  Transaccion,
} from "@/types";

export interface MockDb {
  seedDate: string;
  clientes: Cliente[];
  schedules: PaymentSchedule[];
  doPayments: DoPayment[];
  transacciones: Transaccion[];
  notas: Nota[];
}

/** Registro "crudo" de cobro diario, como lo guardaría la DB real */
interface DoPayment {
  id: number;
  scheduleId: number;
  monto: number;
  fecha: string;
  status: CobroStatus;
  scCobradorId: number | null;
  scNotas: string | null;
}

export const COBRADORES: Cobrador[] = [
  { id: 1, nombre: "Marcos", telefono: "3811110001" },
  { id: 2, nombre: "Luis", telefono: "3811110002" },
  { id: 3, nombre: "Diego", telefono: "3811110003" },
];

const CLIENTES: Cliente[] = [
  { id: 1, nombre: "Ana García", telefono: "3812220001", moneda: "ARP", estatus: "Activo", creado: addDays(-130) },
  { id: 2, nombre: "Carlos Rodríguez", telefono: "3812220002", moneda: "ARP", estatus: "Moroso", creado: addDays(-130) },
  { id: 3, nombre: "Sofia Méndez", telefono: "3812220003", moneda: "ARP", estatus: "Activo", creado: addDays(-130) },
  { id: 4, nombre: "Roberto Álvarez", telefono: "3815010101", moneda: "ARP", estatus: "Activo", creado: addDays(-40) },
  { id: 5, nombre: "Mariela Sánchez", telefono: "3815020202", moneda: "ARP", estatus: "Activo", creado: addDays(-40) },
  { id: 6, nombre: "Jorge Pereyra", telefono: "3815030303", moneda: "ARP", estatus: "Moroso", creado: addDays(-39) },
  { id: 7, nombre: "Claudia Torres", telefono: "3815040404", moneda: "ARP", estatus: "Activo", creado: addDays(-39) },
  { id: 8, nombre: "Nelson Ríos", telefono: "3815050505", moneda: "ARP", estatus: "Moroso", creado: addDays(-38) },
  { id: 9, nombre: "Valeria Gómez", telefono: "3815060606", moneda: "ARP", estatus: "Activo", creado: addDays(-38) },
  { id: 10, nombre: "Héctor Villalba", telefono: "3815070707", moneda: "ARP", estatus: "Activo", creado: addDays(-37) },
  { id: 11, nombre: "Patricia Aguirre", telefono: "3815080808", moneda: "ARP", estatus: "Activo", creado: addDays(-37) },
  { id: 12, nombre: "Daniel Herrera", telefono: "3815090909", moneda: "ARP", estatus: "Moroso", creado: addDays(-36) },
  { id: 13, nombre: "Graciela Luna", telefono: "3815101010", moneda: "ARP", estatus: "Activo", creado: addDays(-36) },
  { id: 14, nombre: "Marcelo Benítez", telefono: "3815111111", moneda: "ARP", estatus: "Moroso", creado: addDays(-35) },
  { id: 15, nombre: "Silvia Romero", telefono: "3815121212", moneda: "ARP", estatus: "Activo", creado: addDays(-35) },
  { id: 16, nombre: "Gustavo Medina", telefono: "3815131313", moneda: "ARP", estatus: "Activo", creado: addDays(-34) },
  { id: 17, nombre: "Laura Ibáñez", telefono: "3815141414", moneda: "ARP", estatus: "Activo", creado: addDays(-34) },
  { id: 18, nombre: "Ricardo Juárez", telefono: "3815151515", moneda: "ARP", estatus: "Moroso", creado: addDays(-33) },
  { id: 19, nombre: "Fernanda Cabrera", telefono: "3815161616", moneda: "ARP", estatus: "Activo", creado: addDays(-33) },
  { id: 20, nombre: "Pablo Mansilla", telefono: "3815171717", moneda: "ARP", estatus: "Moroso", creado: addDays(-32) },
  { id: 21, nombre: "Mónica Reynoso", telefono: "3815181818", moneda: "ARP", estatus: "Activo", creado: addDays(-32) },
];

const SCHEDULES: PaymentSchedule[] = [
  { id: 1, clienteId: 1, cobradorId: 1, pagoAcordado: 200000, frecuencia: "Semanal", status: "Completed", active: true },
  { id: 2, clienteId: 1, cobradorId: 1, pagoAcordado: 200000, frecuencia: "Semanal", status: "Active", active: true },
  { id: 3, clienteId: 2, cobradorId: 2, pagoAcordado: 500000, frecuencia: "Semanal", status: "Defaulted", active: false },
  { id: 4, clienteId: 2, cobradorId: 2, pagoAcordado: 750000, frecuencia: "Semanal", status: "Active", active: true },
  { id: 5, clienteId: 3, cobradorId: 3, pagoAcordado: 350000, frecuencia: "Semanal", status: "Refinanced", active: false },
  { id: 6, clienteId: 3, cobradorId: 3, pagoAcordado: 450000, frecuencia: "Semanal", status: "Refinanced", active: false },
  { id: 7, clienteId: 3, cobradorId: 3, pagoAcordado: 250000, frecuencia: "Semanal", status: "Active", active: true },
  { id: 8, clienteId: 4, cobradorId: 1, pagoAcordado: 180000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 9, clienteId: 5, cobradorId: 1, pagoAcordado: 120000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 10, clienteId: 6, cobradorId: 1, pagoAcordado: 240000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 11, clienteId: 7, cobradorId: 1, pagoAcordado: 150000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 12, clienteId: 8, cobradorId: 1, pagoAcordado: 300000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 13, clienteId: 9, cobradorId: 1, pagoAcordado: 96000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 14, clienteId: 10, cobradorId: 2, pagoAcordado: 210000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 15, clienteId: 11, cobradorId: 2, pagoAcordado: 144000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 16, clienteId: 12, cobradorId: 2, pagoAcordado: 270000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 17, clienteId: 13, cobradorId: 2, pagoAcordado: 168000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 18, clienteId: 14, cobradorId: 2, pagoAcordado: 330000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 19, clienteId: 15, cobradorId: 2, pagoAcordado: 126000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 20, clienteId: 16, cobradorId: 3, pagoAcordado: 192000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 21, clienteId: 17, cobradorId: 3, pagoAcordado: 138000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 22, clienteId: 18, cobradorId: 3, pagoAcordado: 288000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 23, clienteId: 19, cobradorId: 3, pagoAcordado: 162000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 24, clienteId: 20, cobradorId: 3, pagoAcordado: 312000, frecuencia: "Diaria", status: "Active", active: true },
  { id: 25, clienteId: 21, cobradorId: 3, pagoAcordado: 114000, frecuencia: "Diaria", status: "Active", active: true },
];

type SpecialCase = { dia: number; cobradorId: number; notas: string };

/** Patrones de estado por esquema diario: 6 días, hoy = índice 3 */
const DAILY_PATTERNS: Array<{
  scheduleId: number;
  monto: number;
  statuses: CobroStatus[];
  special?: SpecialCase;
}> = [
  { scheduleId: 8, monto: 15000, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 9, monto: 10000, statuses: ["Paid", "Paid", "Paid", "Pending", "Pending", "Pending"] },
  { scheduleId: 10, monto: 20000, statuses: ["Unreachable", "Unreachable", "Overdue", "Overdue", "Overdue", "Overdue"] },
  { scheduleId: 11, monto: 12500, statuses: ["Paid", "Paid", "Paid", "Pending", "Pending", "Pending"] },
  { scheduleId: 12, monto: 25000, statuses: ["Unreachable", "Paid", "Overdue", "Overdue", "Overdue", "Pending"], special: { dia: 1, cobradorId: 3, notas: "Diego cubrió ruta de Marcos" } },
  { scheduleId: 13, monto: 8000, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 14, monto: 17500, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 15, monto: 12000, statuses: ["Paid", "Paid", "Paid", "Pending", "Pending", "Pending"] },
  { scheduleId: 16, monto: 22500, statuses: ["Unreachable", "Unreachable", "Overdue", "Overdue", "Overdue", "Overdue"] },
  { scheduleId: 17, monto: 14000, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 18, monto: 27500, statuses: ["Unreachable", "Paid", "Overdue", "Overdue", "Overdue", "Pending"], special: { dia: 1, cobradorId: 1, notas: "Marcos cubrió ruta de Luis" } },
  { scheduleId: 19, monto: 10500, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 20, monto: 16000, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 21, monto: 11500, statuses: ["Paid", "Paid", "Paid", "Pending", "Pending", "Pending"] },
  { scheduleId: 22, monto: 24000, statuses: ["Unreachable", "Unreachable", "Overdue", "Overdue", "Overdue", "Overdue"] },
  { scheduleId: 23, monto: 13500, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
  { scheduleId: 24, monto: 26000, statuses: ["Unreachable", "Paid", "Overdue", "Overdue", "Overdue", "Pending"], special: { dia: 1, cobradorId: 2, notas: "Luis cobró por Diego (zona cercana)" } },
  { scheduleId: 25, monto: 9500, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
];

/** Esquemas semanales: cuotas cada 7 días desde startOffset */
const WEEKLY_PATTERNS: Array<{
  scheduleId: number;
  monto: number;
  startOffset: number;
  statuses: CobroStatus[];
  special?: SpecialCase;
}> = [
  { scheduleId: 1, monto: 25000, startOffset: -126, statuses: ["Paid", "Paid", "Paid", "Paid", "Paid", "Paid", "Paid", "Paid"] },
  { scheduleId: 2, monto: 25000, startOffset: -28, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending", "Pending", "Pending"] },
  { scheduleId: 3, monto: 62500, startOffset: -119, statuses: ["Paid", "Paid", "Paid", "Paid", "Overdue", "Overdue", "Overdue", "Overdue"] },
  { scheduleId: 4, monto: 93750, startOffset: -28, statuses: ["Paid", "Paid", "Paid", "Paid", "Pending", "Pending", "Pending", "Pending"], special: { dia: 1, cobradorId: 3, notas: "Diego cubrió la cuota" } },
  { scheduleId: 5, monto: 87500, startOffset: -126, statuses: ["Paid", "Paid", "Paid"] },
  { scheduleId: 6, monto: 56250, startOffset: -98, statuses: ["Paid", "Paid", "Paid", "Paid", "Paid", "Paid", "Paid"] },
  { scheduleId: 7, monto: 31250, startOffset: -42, statuses: ["Paid", "Paid", "Paid", "Paid", "Paid", "Paid", "Pending", "Pending"] },
];

function seedDb(): MockDb {
  const doPayments: DoPayment[] = [];
  const transacciones: Transaccion[] = [];
  let dpId = 1;
  let txId = 1;

  const pushTx = (dp: DoPayment, concepto: string, clienteId: number) => {
    transacciones.push({
      id: txId++,
      clienteId,
      cobroId: dp.id,
      tipo: "PAGO",
      concepto,
      monto: dp.monto,
      fecha: dp.fecha,
    });
  };

  for (const w of WEEKLY_PATTERNS) {
    const sched = SCHEDULES.find((s) => s.id === w.scheduleId)!;
    w.statuses.forEach((status, i) => {
      const special = w.special?.dia === i ? w.special : undefined;
      const dp: DoPayment = {
        id: dpId++,
        scheduleId: w.scheduleId,
        monto: w.monto,
        fecha: addDays(w.startOffset + i * 7),
        status,
        scCobradorId: special?.cobradorId ?? null,
        scNotas: special?.notas ?? null,
      };
      doPayments.push(dp);
      if (status === "Paid") {
        const apoyo = special ? ` (Apoyo ${COBRADORES.find((c) => c.id === special.cobradorId)?.nombre})` : "";
        pushTx(dp, `Cuota ${i + 1}/${w.statuses.length}${apoyo}`, sched.clienteId);
      }
    });
  }

  for (const d of DAILY_PATTERNS) {
    const sched = SCHEDULES.find((s) => s.id === d.scheduleId)!;
    d.statuses.forEach((status, i) => {
      const special = d.special?.dia === i ? d.special : undefined;
      const dp: DoPayment = {
        id: dpId++,
        scheduleId: d.scheduleId,
        monto: d.monto,
        fecha: addDays(i - 3), // hoy = índice 3
        status,
        scCobradorId: special?.cobradorId ?? null,
        scNotas: special?.notas ?? null,
      };
      doPayments.push(dp);
      if (status === "Paid") {
        const apoyo = special ? ` (Apoyo ${COBRADORES.find((c) => c.id === special.cobradorId)?.nombre})` : "";
        pushTx(dp, `Cuota diaria${apoyo}`, sched.clienteId);
      }
    });
  }

  const notas: Nota[] = [
    { id: 1, clienteId: 6, clienteNombre: "Jorge Pereyra", contenido: "No estaba en su casa. La vecina dice que vuelve a la tarde. Pasar de nuevo después de las 18hs.", fecha: addDays(-1) },
    { id: 2, clienteId: 8, clienteNombre: "Nelson Ríos", contenido: "Prometió ponerse al día el sábado con dos cuotas juntas. Insistir si no aparece.", fecha: addDays(-2) },
  ];

  return {
    seedDate: todayISO(),
    clientes: structuredClone(CLIENTES),
    schedules: structuredClone(SCHEDULES),
    doPayments,
    transacciones,
    notas,
  };
}

let cache: MockDb | null = null;

export function getDb(): MockDb {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MOCK_DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDb;
        // Los datos de demo son relativos al día: si cambió la fecha, re-sembramos
        if (parsed.seedDate === todayISO()) {
          cache = parsed;
          return cache;
        }
      }
    } catch {
      // seed limpio ante datos corruptos
    }
  }
  cache = seedDb();
  saveDb();
  return cache;
}

export function saveDb(): void {
  if (cache && typeof window !== "undefined") {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(cache));
  }
}

export function nextId(items: Array<{ id: number }>): number {
  return items.reduce((max, i) => Math.max(max, i.id), 0) + 1;
}

/** Simula la latencia de red de la API real */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Une un DoPayment con su esquema y cliente → CobroDia (lo que devolvería la API) */
export function toCobroDia(dp: DoPayment, db: MockDb): CobroDia | null {
  const sched = db.schedules.find((s) => s.id === dp.scheduleId);
  if (!sched) return null;
  const cliente = db.clientes.find((c) => c.id === sched.clienteId);
  if (!cliente) return null;
  return {
    id: dp.id,
    scheduleId: dp.scheduleId,
    fecha: dp.fecha,
    monto: dp.monto,
    status: dp.status,
    frecuencia: sched.frecuencia as Frecuencia,
    scCobradorId: dp.scCobradorId,
    scNotas: dp.scNotas,
    cliente,
  };
}
