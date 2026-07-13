import { cn } from "@/lib/utils";
import { COBRO_STATUS } from "@/lib/status";
import type { CobroStatus } from "@/types";

export function StatusBadge({ status, className }: { status: CobroStatus; className?: string }) {
  const meta = COBRO_STATUS[status];
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold whitespace-nowrap",
        meta.badge,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
