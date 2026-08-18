/**
 * Ubicación del cobro.
 *
 * Los tres SP de cobro reciben `lat`/`lon`, los comparan con
 * `Clientes.ubicacion_geografica_de_destino_de_cobro` con ST_Distance_Sphere y
 * marcan `Dentro_Rango = 1` si el cobro se hizo a ≤ 2 km del domicilio.
 *
 * ⚠️ **Ahora la ubicación es obligatoria para cobrar** (pedido del cliente:
 * "el sistema te tiene que obligar a tener la ubicación prendida"). Antes
 * cualquier fallo se resolvía en `null` y el cobro se registraba igual con
 * `Dentro_Rango = 0`, así que el control de cercanía no servía para nada: un
 * cobrador con el GPS apagado quedaba idéntico a uno que cobró lejos.
 *
 * Por eso esto ya no devuelve `null` a secas: devuelve **por qué** falló, para
 * que la pantalla pueda decir qué hacer y ofrecer reintentar. Un permiso
 * denegado se arregla distinto que un GPS sin señal, y el cobrador está
 * parado frente al cliente.
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
  "sin-senal": "No se pudo tomar la ubicación. Fijate que el GPS del celular esté prendido.",
  demoro: "La ubicación está tardando. Salí a un lugar más abierto y reintentá.",
};

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
