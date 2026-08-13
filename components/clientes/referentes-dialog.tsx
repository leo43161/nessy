"use client";

import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/format";
import type { ReferenteDeCliente } from "@/types";

interface ReferentesDialogProps {
  referentes: ReferenteDeCliente[];
  clienteNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Referentes del cliente, una card por cada uno */
export function ReferentesDialog({
  referentes,
  clienteNombre,
  open,
  onOpenChange,
}: ReferentesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Referentes</DialogTitle>
          <DialogDescription className="text-center">{clienteNombre}</DialogDescription>
        </DialogHeader>

        {referentes.length === 0 ? (
          <EmptyState icon="👥">Este cliente no tiene referentes cargados.</EmptyState>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {referentes.map((ref) => (
              <div key={`${ref.tipo}-${ref.id}`} className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-3">
                  <InitialsAvatar nombre={ref.nombreCompleto} size="md" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{ref.nombreCompleto}</div>
                    <div className="text-[0.68rem] text-muted-foreground">
                      {ref.tipo === "Cliente" ? "Cliente-referente" : "Referente"} · DNI {ref.dni}
                    </div>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-[0.72rem] text-muted-foreground">
                  {ref.direccion && <div>{ref.direccion}</div>}
                  {ref.localidadNombre && <div>{ref.localidadNombre}</div>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ref.telefonos.map((t) => (
                    <a
                      key={t.id}
                      href={whatsappUrl(t.numero)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[0.68rem] font-medium hover:bg-muted/70"
                    >
                      <MessageCircle className="size-3" />
                      {t.numero}
                    </a>
                  ))}
                  {ref.telefonos.length > 0 && (
                    <WhatsappButton telefonos={ref.telefonos}>
                      <Button variant="outline" size="xs">
                        WhatsApp
                      </Button>
                    </WhatsappButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
