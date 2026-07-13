"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkDateDialog } from "@/components/cobros/work-date-dialog";
import { useAppSelector } from "@/store/hooks";
import { formatDayLabel, formatFecha } from "@/lib/format";

/** Cabecera con el día de trabajo y el acceso para cambiarlo */
export function DateHeader() {
  const workDate = useAppSelector((s) => s.ui.workDate);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Card className="mb-3.5 flex-row items-center justify-between gap-2 px-4 py-3">
      <div>
        <div className="font-bold">{formatDayLabel(workDate)}</div>
        <div className="text-xs text-muted-foreground">
          Cobros programados · {formatFecha(workDate)}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <CalendarDays />
        Cambiar
      </Button>
      <WorkDateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
