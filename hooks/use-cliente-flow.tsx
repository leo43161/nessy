"use client";

import { useState } from "react";
import { BalanceDialog } from "@/components/clientes/balance-dialog";
import { CargoDialog } from "@/components/clientes/cargo-dialog";
import { PagoDialog } from "@/components/clientes/pago-dialog";
import { NotaFormDialog } from "@/components/notas/nota-form-dialog";
import type { ClienteResumen } from "@/types";

interface ClienteRef {
  id: number;
  nombre: string;
}

/**
 * Orquesta el flujo de modales alrededor de un cliente
 * (balance → nota / cargo / pago) compartido entre Cobros y Clientes.
 */
export function useClienteFlow(onDataChanged?: () => void) {
  const [balanceId, setBalanceId] = useState<number | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [notaCliente, setNotaCliente] = useState<ClienteRef | null>(null);
  const [notaOpen, setNotaOpen] = useState(false);
  const [cargoCliente, setCargoCliente] = useState<ClienteResumen | null>(null);
  const [cargoOpen, setCargoOpen] = useState(false);
  const [pagoCliente, setPagoCliente] = useState<ClienteResumen | null>(null);
  const [pagoOpen, setPagoOpen] = useState(false);

  const openBalance = (clienteId: number) => {
    setBalanceId(clienteId);
    setBalanceOpen(true);
  };

  const openNota = (cliente: ClienteRef) => {
    setNotaCliente(cliente);
    setNotaOpen(true);
  };

  // Cargo/Pago reemplazan al balance; al guardar se vuelve al balance actualizado
  const handleCargo = (cliente: ClienteResumen) => {
    setBalanceOpen(false);
    setCargoCliente(cliente);
    setCargoOpen(true);
  };

  const handlePago = (cliente: ClienteResumen) => {
    setBalanceOpen(false);
    setPagoCliente(cliente);
    setPagoOpen(true);
  };

  const handleSaved = (cliente: ClienteResumen) => {
    onDataChanged?.();
    openBalance(cliente.id);
  };

  const dialogs = (
    <>
      <BalanceDialog
        clienteId={balanceId}
        open={balanceOpen}
        onOpenChange={setBalanceOpen}
        onNota={openNota}
        onCargo={handleCargo}
        onPago={handlePago}
      />
      <NotaFormDialog cliente={notaCliente} open={notaOpen} onOpenChange={setNotaOpen} />
      <CargoDialog
        cliente={cargoCliente}
        open={cargoOpen}
        onOpenChange={setCargoOpen}
        onSaved={handleSaved}
      />
      <PagoDialog
        cliente={pagoCliente}
        open={pagoOpen}
        onOpenChange={setPagoOpen}
        onSaved={handleSaved}
      />
    </>
  );

  return { openBalance, openNota, dialogs };
}
