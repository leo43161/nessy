"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setWorkDate } from "@/store/slices/ui.slice";
import { addDays, todayISO } from "@/lib/format";

interface WorkDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK = [
  { label: "Hoy", offset: 0 },
  { label: "Ayer", offset: -1 },
  { label: "Mañana", offset: 1 },
];

/** Selector del día de trabajo del cobrador */
export function WorkDateDialog({ open, onOpenChange }: WorkDateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* El form se monta al abrir, así arranca siempre con la fecha vigente */}
        <WorkDateForm onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function WorkDateForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const dispatch = useAppDispatch();
  const workDate = useAppSelector((s) => s.ui.workDate);
  const [fecha, setFecha] = useState(workDate ?? todayISO());

  const confirmar = () => {
    if (!fecha) return;
    dispatch(setWorkDate(fecha));
    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>¿Qué día estás trabajando?</DialogTitle>
        <DialogDescription>
          Seleccioná la fecha para ver los cobros programados de ese día.
        </DialogDescription>
      </DialogHeader>

      <Input
        type="date"
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        className="h-11 justify-center text-center font-mono"
      />
      <div className="flex gap-2">
        {QUICK.map((q) => (
          <Button
            key={q.label}
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setFecha(addDays(q.offset))}
          >
            {q.label}
          </Button>
        ))}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={!fecha}>
          Ver Cobros →
        </Button>
      </DialogFooter>
    </>
  );
}
