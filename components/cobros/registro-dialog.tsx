"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, MapPin, MessageCircle, ReceiptText, RotateCw, User } from "lucide-react";
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
import { ReferentesCliente } from "@/components/clientes/referentes-cliente";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registrarAdvertencia, registrarPago } from "@/store/slices/cobros.slice";
import { useMetodosDePago } from "@/hooks/use-catalogos";
import { marcarWhatsAppEnviado } from "@/services/cobros.service";
import { bloqueaElCobro, obtenerUbicacion, type ResultadoUbicacion } from "@/lib/geo";
import { fmtMoney, formatFecha, mapaUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
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
  /**
   * Si al mandar el estado de cuenta hay que marcar `WhatsApp_Enviado`.
   *
   * Solo después de COBRAR, donde ese mensaje es el comprobante. Después de un
   * "no pude cobrar" NO: el admin lee esa columna como "reclamo realizado", y
   * el reclamo es una acción suya —el botón «Reclamar» del tablero—, no del
   * cobrador. Marcándola acá, una cuota recién marcada atrasada le aparecía al
   * admin como ya reclamada y nadie la reclamaba nunca.
   */
  const [marcarComprobante, setMarcarComprobante] = useState(false);
  const [advertenciaOpen, setAdvertenciaOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [motivo, setMotivo] = useState(MOTIVOS_ADVERTENCIA[0]);

  /**
   * Cobro adelantado: de dónde sale el sobrante.
   *
   * `false` —el final del plan— es el default porque es lo único que el
   * sistema hizo hasta ahora. Un cobrador que no mire esta opción registra el
   * cobro exactamente como se registraba antes.
   */
  const [desdeLaProxima, setDesdeLaProxima] = useState(false);

  // El monto y el método se DERIVAN mientras el cobrador no los toque, en vez
  // de sincronizarse con un efecto: null significa "todavía no lo cambió".
  //
  // Así el monto arranca solo en lo esperado (el caso normal es cobrar justo,
  // y conviene que confirme en vez de tipear) y el método en el primero de la
  // lista, sin re-renders en cascada ni un estado que puede quedar viejo si
  // cambia la cuota.
  const [montoEditado, setMontoEditado] = useState<string | null>(null);
  const [metodoElegido, setMetodoElegido] = useState<number | null>(null);

  /**
   * La ubicación, que ahora es obligatoria para cobrar.
   *
   * Se pide al abrir el diálogo y no recién al apretar "Cobrar": el GPS puede
   * tardar y el permiso puede estar denegado, y es mejor que el cobrador se
   * entere mientras mira la ficha que después de tipear el monto.
   */
  const [ubicacion, setUbicacion] = useState<ResultadoUbicacion | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  const pedirUbicacion = useCallback(async () => {
    setBuscandoUbicacion(true);
    setUbicacion(await obtenerUbicacion());
    setBuscandoUbicacion(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setUbicacion(null);
      return;
    }
    void pedirUbicacion();
  }, [open, pedirUbicacion]);

  const monto = montoEditado ?? String(cobro?.montoEsperado ?? "");
  const idMetodo = metodoElegido ?? metodos[0]?.id ?? 0;

  /** Al cerrar se olvida lo tipeado: el próximo cobro arranca limpio. */
  const cerrar = (abierto: boolean) => {
    if (!abierto) {
      setMontoEditado(null);
      setMetodoElegido(null);
      setNuevaFecha("");
      setDesdeLaProxima(false);
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
    (tipo !== "parcial" || nuevaFecha !== "") &&
    // Lo que se exige es que la ubicación esté PRENDIDA, no que el GPS haya
    // conseguido fijar la posición: con el permiso dado y sin señal el cobro
    // sale igual y queda con `Dentro_Rango = 0`. Bloquear por señal dejaba al
    // cobrador sin poder registrar, con el cliente enfrente pagando.
    ubicacion !== null &&
    !bloqueaElCobro(ubicacion);
  // Asistencia: el cobrador logueado no es el asignado → se marcará fuera de rango
  const asistiendo = cobrador.id !== cobro.cobradorAsignadoId;
  const mensajeDemora = `Hola ${cliente.nombreCompleto.split(" ")[0]}! Te recordamos la cuota pendiente de ${fmtMoney(cobro.montoEsperado)} (${formatFecha(cobro.fechaAcordada)}). ¿Coordinamos el pago?`;

  const registrar = async () => {
    // El botón ya está deshabilitado, pero se vuelve a mirar acá: es la última
    // puerta antes de mandar el cobro, y `puedeCobrar` es una condición de UI
    // que mañana puede cambiar sin que nadie se acuerde de esto.
    if (ubicacion === null || bloqueaElCobro(ubicacion)) {
      toast.error(ubicacion?.ok === false ? ubicacion.mensaje : "Tomando la ubicación…");
      return;
    }

    setRegistrando(true);

    const result = await dispatch(
      registrarPago({
        pagoId: cobro.id,
        monto: montoNum,
        idMetodoDePago: idMetodo,
        nuevaFecha: tipo === "parcial" ? nuevaFecha : undefined,
        desdeLaProxima: tipo === "adelantado" ? desdeLaProxima : undefined,
        cobradorId: cobrador.id,
        // Sin posición van en null: la API responde `sin_ubicacion: true` y
        // deja `Dentro_Rango = 0`. Nunca rechaza el cobro por eso.
        lat: ubicacion.ok ? ubicacion.ubicacion.lat : null,
        lon: ubicacion.ok ? ubicacion.ubicacion.lon : null,
      }),
    );
    setRegistrando(false);

    if (registrarPago.fulfilled.match(result)) {
      toast.success(`${cliente.nombreCompleto}: ${fmtMoney(montoNum)} cobrados`);
      // Tras cobrar, el estado de cuenta es obligatorio: es el comprobante, y
      // por eso este es el único caso que deja registrado que se mandó.
      setMarcarComprobante(true);
      setEstadoCuentaObligatorio(true);
      setEstadoCuentaOpen(true);
    } else {
      toast.error(result.payload ?? "No se pudo registrar el pago.");
    }
  };

  const guardarAdvertencia = async () => {
    setRegistrando(true);
    // Va con `cuotaId`: además de dejar el motivo, marca ESA cuota como
    // atrasada. Sin él quedaba la advertencia colgada del plan y nadie podía
    // saber después a qué cuota se había ido.
    const result = await dispatch(
      registrarAdvertencia({ planId: cobro.planId, cuotaId: cobro.id, motivo }),
    );
    setRegistrando(false);

    if (registrarAdvertencia.fulfilled.match(result)) {
      // La cuota queda `Atrasado` —se fue y no se pudo— y el motivo registrado.
      toast.success(`Cuota marcada como atrasada: ${motivo}`);
      setAdvertenciaOpen(false);
      // Incomunicado también manda estado de cuenta: si el cliente no
      // contesta, el destinatario puede ser el garante. Pero NO se marca
      // `WhatsApp_Enviado`: eso es el reclamo del admin, no esto.
      setMarcarComprobante(false);
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

          {/* Plegado: el garante es el plan B. Pero está acá y no a tres
              pantallas, que es donde estaba cuando el cliente no atiende. */}
          <ReferentesCliente clienteId={cliente.id} plegado />

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
                <p className="text-sm text-muted-foreground">
                  {montoNum > 0 ? TIPO_DE_COBRO_LABEL[tipo] : "Ingresá cuánto entró"}
                </p>
              </div>

              {/* Pagó de más: hay que elegir de dónde sale el sobrante, porque
                  las dos opciones NO hacen lo mismo. Una le acorta el plan y la
                  otra le libera las semanas que vienen. Por eso están escritas
                  con la consecuencia, no con el nombre técnico. */}
              {tipo === "adelantado" && montoNum > 0 && (
                <div className="space-y-2 rounded-lg border border-input bg-card p-3">
                  <div className="text-sm font-semibold">
                    Sobran {fmtMoney(montoNum - cobro.montoEsperado)}. ¿De dónde los descontamos?
                  </div>

                  <OpcionSobrante
                    activa={!desdeLaProxima}
                    onClick={() => setDesdeLaProxima(false)}
                    titulo="De las últimas cuotas"
                    detalle="Termina de pagar antes. Las próximas semanas sigue pagando igual."
                    disabled={registrando}
                  />
                  <OpcionSobrante
                    activa={desdeLaProxima}
                    onClick={() => setDesdeLaProxima(true)}
                    titulo="De las próximas cuotas"
                    detalle="Se saltea las semanas que vienen. El plan termina en la misma fecha."
                    disabled={registrando}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="metodo">Método de pago</Label>
                <select
                  id="metodo"
                  value={idMetodo}
                  onChange={(e) => setMetodoElegido(Number(e.target.value))}
                  disabled={registrando || metodos.length === 0}
                  className="h-11 w-full rounded-md border border-input bg-transparent px-3.5 text-base shadow-xs disabled:opacity-50"
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

              <EstadoUbicacion
                estado={ubicacion}
                buscando={buscandoUbicacion}
                onReintentar={pedirUbicacion}
              />

              <Button className="w-full" size="lg" disabled={!puedeCobrar} onClick={registrar}>
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

          {/* Dos botones y no tres: el de "Llamar" abría el discador, y todo
              contacto con el cliente va por WhatsApp. */}
          <div className="grid grid-cols-2 gap-2">
            <WhatsappButton telefonos={cliente.telefonos} mensaje={mensajeDemora}>
              <ActionShell
                icon={<MessageCircle />}
                label="WhatsApp"
                disabled={cliente.telefonos.length === 0}
              />
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
            // acá **es** el envío. Solo se deja registrado en la cuota cuando
            // ese envío fue el comprobante de un cobro: la columna
            // `WhatsApp_Enviado` es la que el admin lee como reclamo.
            if (marcarComprobante) marcarWhatsAppEnviado(cobro.id);
            setMarcarComprobante(false);
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
      className="flex cursor-pointer flex-col items-center gap-1 rounded-lg bg-muted px-1.5 py-2.5 text-[0.62rem] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:size-4"
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

/**
 * El estado del GPS, arriba del botón de cobrar.
 *
 * Es lo único que separa al cobrador de registrar el cobro, así que dice qué
 * pasa y qué hacer, y trae el botón de reintentar al lado: en la calle el
 * primer intento falla seguido y volver a abrir el diálogo para que se
 * dispare de nuevo no es una instrucción que nadie vaya a deducir.
 */
function EstadoUbicacion({
  estado,
  buscando,
  onReintentar,
}: {
  estado: ResultadoUbicacion | null;
  buscando: boolean;
  onReintentar: () => void;
}) {
  if (buscando || estado === null) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Tomando la ubicación…
      </div>
    );
  }

  if (estado.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">
        <MapPin className="size-4 shrink-0" />
        Ubicación tomada
      </div>
    );
  }

  // Dos situaciones distintas: la ubicación apagada (hay que prenderla) y la
  // ubicación prendida que no llega a fijar la posición (se cobra igual).
  const bloquea = bloqueaElCobro(estado);

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg px-3 py-2.5",
        bloquea ? "bg-destructive/10" : "bg-amber-50 dark:bg-amber-950/50",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2 text-sm font-semibold",
          bloquea ? "text-destructive" : "text-amber-800 dark:text-amber-200",
        )}
      >
        <MapPin className="mt-0.5 size-4 shrink-0" />
        <span>{estado.mensaje}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {bloquea
          ? "Con la ubicación apagada no se puede registrar el cobro. Si el cliente no paga, usá «No pude cobrar»."
          : "El cobro queda registrado sin verificar la cercanía al domicilio."}
      </p>
      <Button variant="outline" size="sm" className="w-full" onClick={onReintentar}>
        <RotateCw />
        Reintentar ubicación
      </Button>
    </div>
  );
}

/**
 * Una de las dos opciones del sobrante.
 *
 * Botón grande con el título y la consecuencia, no un radio chiquito: la
 * diferencia entre las dos no está en el nombre —las dos "descuentan cuotas"—
 * sino en qué le pasa al cliente después, y eso hay que poder leerlo.
 */
function OpcionSobrante({
  activa,
  onClick,
  titulo,
  detalle,
  disabled,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  detalle: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activa}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition-colors disabled:opacity-50",
        activa
          ? "border-primary bg-accent text-accent-foreground"
          : "border-input hover:bg-muted",
      )}
    >
      <span className="text-base font-semibold">{titulo}</span>
      <span className="text-sm text-muted-foreground">{detalle}</span>
    </button>
  );
}
