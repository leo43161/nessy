"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Phone, ReceiptText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InitialsAvatar } from "@/components/shared/initials-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { WhatsappButton } from "@/components/shared/whatsapp-button";
import { EstadoCuentaDialog } from "@/components/clientes/estado-cuenta-dialog";
import { NotasCliente } from "@/components/clientes/notas-cliente";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registrarAdvertencia, registrarPago } from "@/store/slices/cobros.slice";
import { useMetodosDePago } from "@/hooks/use-catalogos";
import { marcarWhatsAppEnviado } from "@/services/cobros.service";
import { obtenerUbicacion } from "@/lib/geo";
import { fmtMoney, formatFecha, mapaUrl } from "@/lib/format";
import {
  esVencido,
  MOTIVOS_ADVERTENCIA,
  TIPO_DE_COBRO_LABEL,
  tipoDeCobro,
} from "@/lib/status";
import type { CobroDelDia } from "@/types";

interface RegistroDialogProps {
  cobro: CobroDelDia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerCliente: (clienteId: number) => void;
}

/**
 * Registro de cobro.
 *
 * El cobrador pone cuánto entró y el método; el resto lo deduce la API. Si no
 * pudo cobrar, deja una advertencia sobre el plan en vez de un estado en la
 * cuota (decisión N.4).
 */
export function RegistroDialog({ cobro, open, onOpenChange, onVerCliente }: RegistroDialogProps) {
  const dispatch = useAppDispatch();
  const cobrador = useAppSelector((s) => s.auth.cobrador);
  const workDate = useAppSelector((s) => s.ui.workDate);
  const metodos = useMetodosDePago();

  const [registrando, setRegistrando] = useState(false);
  const [estadoCuentaOpen, setEstadoCuentaOpen] = useState(false);
  // Cerrada la visita —se cobró o quedó la advertencia— el estado de cuenta
  // deja de ser opcional: el diálogo no se cierra hasta que lo mande.
  const [estadoCuentaObligatorio, setEstadoCuentaObligatorio] = useState(false);
  const [advertenciaOpen, setAdvertenciaOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [motivo, setMotivo] = useState(MOTIVOS_ADVERTENCIA[0]);

  // El monto y el método se DERIVAN mientras el cobrador no los toque, en vez
  // de sincronizarse con un efecto: null significa "todavía no lo cambió".
  //
  // Así el monto arranca solo en lo esperado (el caso normal es cobrar justo,
  // y conviene que confirme en vez de tipear) y el método en el primero de la
  // lista, sin re-renders en cascada ni un estado que puede quedar viejo si
  // cambia la cuota.
  const [montoEditado, setMontoEditado] = useState<string | null>(null);
  const [metodoElegido, setMetodoElegido] = useState<number | null>(null);

  const monto = montoEditado ?? String(cobro?.montoEsperado ?? "");
  const idMetodo = metodoElegido ?? metodos[0]?.id ?? 0;

  /** Al cerrar se olvida lo tipeado: el próximo cobro arranca limpio. */
  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      setMontoEditado(null);
      setMetodoElegido(null);
      setNuevaFecha("");
    }
    onOpenChange(abierto);
  };

  if (!cobro || !cobrador) return null;

  const { cliente } = cobro;
  const vencido = esVencido(cobro.estado, cobro.fechaAcordada, workDate ?? "");
  const yaCobrada = cobro.estado === "Pagado";
  const montoNum = Number(monto) || 0;
  const tipo = tipoDeCobro(montoNum, cobro.montoEsperado);
  const puedeCobrar =
    !registrando &&
    montoNum > 0 &&
    idMetodo > 0 &&
    (tipo !== "parcial" || nuevaFecha !== "");
  // Asistencia: el cobrador logueado no es el asignado → se marcará fuera de rango
  const asistiendo = cobrador.id !== cobro.cobradorAsignadoId;
  const mensajeDemora = `Hola ${cliente.nombreCompleto.split(" ")[0]}! Te recordamos la cuota pendiente de ${fmtMoney(cobro.montoEsperado)} (${formatFecha(cobro.fechaAcordada)}). ¿Coordinamos el pago?`;

  const registrar = async () => {
    setRegistrando(true);

    // N.5: la ubicación decide Dentro_Rango (≤ 2 km del domicilio), pero nunca
    // bloquea el cobro. Si el navegador no la da, se manda en null.
    const ubicacion = await obtenerUbicacion();

    const result = await dispatch(
      registrarPago({
        pagoId: cobro.id,
        monto: montoNum,
        idMetodoDePago: idMetodo,
        nuevaFecha: tipo === "parcial" ? nuevaFecha : undefined,
        cobradorId: cobrador.id,
        lat: ubicacion?.lat ?? null,
        lon: ubicacion?.lon ?? null,
      }),
    );
    setRegistrando(false);

    if (registrarPago.fulfilled.match(result)) {
      toast.success(`${cliente.nombreCompleto}: ${fmtMoney(montoNum)} cobrados`, {
        description: ubicacion ? undefined : "Sin ubicación: quedará fuera de rango.",
      });
      // Tras cobrar, el estado de cuenta es obligatorio: es el comprobante.
      setEstadoCuentaObligatorio(true);
      setEstadoCuentaOpen(true);
    } else {
      toast.error(result.payload ?? "No se pudo registrar el pago.");
    }
  };

  const guardarAdvertencia = async () => {
    setRegistrando(true);
    const result = await dispatch(
      registrarAdvertencia({ planId: cobro.planId, motivo }),
    );
    setRegistrando(false);

    if (registrarAdvertencia.fulfilled.match(result)) {
      // La cuota NO cambia de estado: sigue pendiente. Lo que queda registrado
      // es por qué no se pudo cobrar (N.4).
      toast.success(`Advertencia registrada: ${motivo}`);
      setAdvertenciaOpen(false);
      // Incomunicado también manda estado de cuenta: si el cliente no
      // contesta, el destinatario puede ser el garante.
      setEstadoCuentaObligatorio(true);
      setEstadoCuentaOpen(true);
    } else {
      toast.error(result.payload ?? "No se pudo registrar la advertencia.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Registrar Cobro</DialogTitle>
            <DialogDescription className="sr-only">
              Registrar el estado del cobro con un click
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3.5">
            <InitialsAvatar
              nombre={cliente.nombreCompleto}
              size="lg"
            />
            <div className="min-w-0">
              <div className="truncate font-bold">{cliente.nombreCompleto}</div>
              <div className="text-xs text-muted-foreground">
                {/* ubicacionCobro son coordenadas, no una dirección: se muestra
                    como link al mapa y el texto queda para la dirección. */}
                {mapaUrl(cliente.ubicacionCobro) ? (
                  <>
                    {cliente.direccion ?? "—"}{" "}
                    <a
                      href={mapaUrl(cliente.ubicacionCobro)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      · mapa
                    </a>
                  </>
                ) : (
                  (cliente.ubicacionCobro ?? cliente.direccion ?? "—")
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Monto Esperado">
              <span className="text-primary">{fmtMoney(cobro.montoEsperado)}</span>
            </InfoCard>
            <InfoCard label="Plan">{cobro.planNombre}</InfoCard>
            <InfoCard label="Fecha">{formatFecha(cobro.fechaAcordada)}</InfoCard>
            <InfoCard label="Estado">
              <StatusBadge estado={cobro.estado} vencido={vencido} />
            </InfoCard>
          </div>

          {/* Las notas van antes de cobrar: son el contexto de la visita. */}
          <NotasCliente clienteId={cliente.id} />

          {asistiendo && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Estás asistiendo a <strong>{cobro.cobradorAsignadoNombre}</strong>. Este cobro se
                registrará <strong>fuera de rango</strong> y el admin lo verá como asistencia.
              </span>
            </div>
          )}

          {yaCobrada ? (
            <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200">
              Esta cuota ya está cobrada. La API rechaza un segundo cobro (409).
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Registrar cobro
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="monto">Monto cobrado</Label>
                <Input
                  id="monto"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMontoEditado(e.target.value)}
                  // Un input number enfocado toma la rueda del mouse y suma o
                  // resta un `step`. Scrolleando el diálogo para llegar al
                  // botón, el importe cambiaba solo: 10.000 pasaba a 9.999,99
                  // y el cobro se registraba por ese monto. Se le saca el foco
                  // y la rueda vuelve a scrollear la página.
                  onWheel={(e) => e.currentTarget.blur()}
                  disabled={registrando}
                />
                {/* El tipo no se elige: lo deduce la API del monto. Se muestra
                    para que el cobrador vea qué va a pasar antes de confirmar. */}
                <p className="text-xs text-muted-foreground">
                  {montoNum > 0 ? TIPO_DE_COBRO_LABEL[tipo] : "Ingresá cuánto entró"}
                  {tipo === "adelantado" && montoNum > 0 && (
                    <> · el sobrante de {fmtMoney(montoNum - cobro.montoEsperado)} cancela cuotas futuras</>
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="metodo">Método de pago</Label>
                <select
                  id="metodo"
                  value={idMetodo}
                  onChange={(e) => setMetodoElegido(Number(e.target.value))}
                  disabled={registrando || metodos.length === 0}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs disabled:opacity-50"
                >
                  {metodos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* El SP del cobro parcial crea una cuota nueva por la diferencia:
                  sin fecha no sabe cuándo vence. */}
              {tipo === "parcial" && montoNum > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="nuevaFecha">
                    ¿Cuándo paga los {fmtMoney(cobro.montoEsperado - montoNum)} restantes?
                  </Label>
                  <Input
                    id="nuevaFecha"
                    type="date"
                    value={nuevaFecha}
                    min={cobro.fechaAcordada}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    disabled={registrando}
                  />
                </div>
              )}

              <Button className="w-full" disabled={!puedeCobrar} onClick={registrar}>
                {registrando ? <Loader2 className="animate-spin" /> : <ReceiptText />}
                {registrando ? "Registrando…" : `Cobrar ${fmtMoney(montoNum)}`}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                disabled={registrando}
                onClick={() => setAdvertenciaOpen(true)}
              >
                <AlertTriangle />
                No pude cobrar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              icon={<Phone />}
              label="Llamar"
              disabled={cliente.telefonos.length === 0}
              onClick={() => cliente.telefonos[0] && window.open(`tel:${cliente.telefonos[0].numero}`)}
            />
            <WhatsappButton telefonos={cliente.telefonos} mensaje={mensajeDemora}>
              <ActionShell icon={<Phone />} label="WhatsApp" disabled={cliente.telefonos.length === 0} />
            </WhatsappButton>
            <ActionButton
              icon={<User />}
              label="Ver cliente"
              onClick={() => {
                onOpenChange(false);
                onVerCliente(cliente.id);
              }}
            />
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setEstadoCuentaObligatorio(false);
                setEstadoCuentaOpen(true);
              }}
            >
              <ReceiptText />
              Estado de cuenta
            </Button>
            <Button variant="outline" onClick={() => cerrar(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* "No pude cobrar" → advertencia sobre el plan. La cuota no cambia de
          estado: sigue pendiente, y queda registrado el motivo (N.4). */}
      <Dialog open={advertenciaOpen} onOpenChange={setAdvertenciaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No se pudo cobrar</DialogTitle>
            <DialogDescription>
              Queda registrado el motivo. La cuota sigue pendiente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo</Label>
            <select
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={registrando}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs disabled:opacity-50"
            >
              {MOTIVOS_ADVERTENCIA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvertenciaOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={registrando} onClick={guardarAdvertencia}>
              {registrando ? <Loader2 className="animate-spin" /> : <AlertTriangle />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EstadoCuentaDialog
        clienteId={cliente.id}
        telefonos={cliente.telefonos}
        cliente={{
          nombreCompleto: cliente.nombreCompleto,
          dni: cliente.dni,
          direccion: cliente.direccion,
          localidadNombre: cliente.localidadNombre,
        }}
        obligatorio={estadoCuentaObligatorio}
        open={estadoCuentaOpen}
        onOpenChange={(o) => {
          setEstadoCuentaOpen(o);
          if (!o && estadoCuentaObligatorio) {
            // En modo obligatorio la única forma de cerrar es enviando: ni la
            // cruz, ni Escape, ni el click afuera lo cierran. Así que llegar
            // acá **es** el envío, y se deja registrado en la cuota.
            marcarWhatsAppEnviado(cobro.id);
            setEstadoCuentaObligatorio(false);
            // La visita terminó: se cierra el registro. Vía `cerrar` y no
            // `onOpenChange` para que se olviden el monto y la fecha tipeados,
            // que si no aparecían prellenados en el cobro del cliente siguiente.
            cerrar(false);
          }
        }}
      />
    </>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <div className="mb-0.5 text-[0.62rem] font-bold tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-mono text-sm font-bold">{children}</div>
    </div>
  );
}

function ActionShell({
  icon,
  label,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span
      aria-disabled={disabled}
      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg bg-muted px-1.5 py-2.5 text-[0.62rem] font-semibold text-muted-foreground transition-colors hover:bg-orange-100 hover:text-orange-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 dark:hover:bg-orange-950 dark:hover:text-orange-300 [&_svg]:size-4"
    >
      {icon}
      {label}
    </span>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="contents">
      <ActionShell icon={icon} label={label} disabled={disabled} />
    </button>
  );
}
