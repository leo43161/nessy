/**
 * Ubicación del cobro.
 *
 * Los tres SP de cobro reciben `lat`/`lon`, los comparan con
 * `Clientes.ubicacion_geografica_de_destino_de_cobro` con ST_Distance_Sphere y
 * marcan `Dentro_Rango = 1` si el cobro se hizo a ≤ 2 km del domicilio.
 *
 * **Lo que se exige para cobrar es que la ubicación esté ACTIVA, no que se
 * haya podido fijar la posición.** El pedido del cliente fue "que el sistema
 * te obligue a tener la ubicación prendida"; bloquear además por señal
 * convertía un problema del GPS en un cobro que no se podía registrar con el
 * cliente enfrente pagando.
 *
 * Por eso esto no devuelve `null` a secas: devuelve **por qué** falló, y
 * `bloqueaElCobro()` separa las dos cosas. Un permiso denegado se arregla
 * (tocar el candado y permitir); un GPS sin señal, no.
 */

export interface Ubicacion {
  lat: number;
  lon: number;
}

export type MotivoSinUbicacion =
  /** El navegador no tiene API de geolocalización (o corre sin HTTPS) */
  | "no-soportado"
  /** El usuario denegó el permiso, o el sitio lo tiene bloqueado */
  | "denegado"
  /** Hay permiso pero no se pudo fijar la posición: sin señal, GPS apagado */
  | "sin-senal"
  /** Tardó más que `TIMEOUT_MS` */
  | "demoro";

export type ResultadoUbicacion =
  | { ok: true; ubicacion: Ubicacion }
  | { ok: false; motivo: MotivoSinUbicacion; mensaje: string };

/**
 * Qué se le muestra al cobrador en cada caso. Son instrucciones, no
 * diagnósticos: quien lee esto está en la calle y necesita saber qué tocar.
 */
const MENSAJES: Record<MotivoSinUbicacion, string> = {
  "no-soportado": "Este navegador no puede dar la ubicación. Abrí la app desde Chrome.",
  denegado:
    "Diste que no a la ubicación. Tocá el candado al lado de la dirección, permití Ubicación y reintentá.",
  "sin-senal": "No se pudo fijar la posición. Podés cobrar igual: el cobro va a quedar sin ubicación.",
  demoro: "La ubicación está tardando. Podés cobrar igual: el cobro va a quedar sin ubicación.",
};

/**
 * ¿Este fallo impide cobrar?
 *
 * Solo los dos que significan "la ubicación NO está activa": el permiso
 * denegado y el navegador que no la soporta. Esos dependen del cobrador y se
 * arreglan tocando el candado.
 *
 * `sin-senal` y `demoro` **no** bloquean: la ubicación está prendida y el
 * problema es del GPS. El cobro se registra con `Dentro_Rango = 0`, que es
 * exactamente lo que significa: no se pudo verificar la cercanía.
 */
export function bloqueaElCobro(estado: ResultadoUbicacion): boolean {
  return !estado.ok && (estado.motivo === "denegado" || estado.motivo === "no-soportado");
}

/**
 * Más que esto y el cobrador espera de gusto. Es más largo que antes (8 s)
 * porque ahora de esto depende poder cobrar: un GPS que arranca en frío
 * tarda, y cortarlo temprano bloqueaba un cobro que iba a salir bien.
 */
const TIMEOUT_MS = 15000;

function sinUbicacion(motivo: MotivoSinUbicacion): ResultadoUbicacion {
  return { ok: false, motivo, mensaje: MENSAJES[motivo] };
}

export async function obtenerUbicacion(): Promise<ResultadoUbicacion> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return sinUbicacion("no-soportado");
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, ubicacion: { lat: pos.coords.latitude, lon: pos.coords.longitude } }),
      (err) => {
        // Los códigos son los del estándar; el navegador no siempre exporta
        // las constantes en el objeto de error, así que se comparan crudos.
        if (err.code === 1) return resolve(sinUbicacion("denegado"));
        if (err.code === 3) return resolve(sinUbicacion("demoro"));
        return resolve(sinUbicacion("sin-senal"));
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}
