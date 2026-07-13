import { cn } from "@/lib/utils";
import type { CobroDia } from "@/types";

interface CobrosSummaryProps {
  cobros: CobroDia[];
}

/** Mini-tarjetas con el resumen del día */
export function CobrosSummary({ cobros }: CobrosSummaryProps) {
  const total = cobros.length;
  const cobrados = cobros.filter((c) => c.status === "Paid").length;
  const pendientes = cobros.filter((c) => c.status === "Pending").length;
  const vencidos = cobros.filter((c) => c.status === "Overdue").length;
  const ilocalizables = cobros.filter((c) => c.status === "Unreachable").length;

  const stats = [
    { valor: `${cobrados}/${total}`, label: "Cobrados", highlight: true },
    { valor: pendientes, label: "Pendientes" },
    { valor: vencidos, label: "No pagó", color: "text-red-500" },
    { valor: ilocalizables, label: "Ilocalizables", color: "text-violet-500" },
  ];

  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "rounded-lg border px-2.5 py-2 text-center shadow-sm",
            s.highlight
              ? "border-transparent bg-gradient-to-br from-orange-500 to-orange-600 text-white"
              : "bg-card"
          )}
        >
          <div className={cn("font-mono text-base font-bold", !s.highlight && s.color)}>
            {s.valor}
          </div>
          <div
            className={cn(
              "text-[0.6rem] font-semibold tracking-wide uppercase",
              s.highlight ? "text-white/75" : "text-muted-foreground"
            )}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
