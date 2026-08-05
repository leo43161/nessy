/**
 * Ubicación del cobro (decisión N.5).
 *
 * Los tres SP de cobro reciben `lat`/`lon`, los comparan con
 * `Clientes.ubicacion_geografica_de_destino_de_cobro` con ST_Distance_Sphere y
 * marcan `Dentro_Rango = 1` si el cobro se hizo a ≤ 2 km del domicilio.
 *
 * **Nunca bloquea el cobro.** Si el navegador niega el permiso, no hay GPS o
 * tarda demasiado, se registra igual con lat/lon en null: la API responde
 * `sin_ubicacion: true` y la cuota queda con `Dentro_Rango = 0`. Un cobrador
 * parado frente al cliente no puede quedarse sin poder cobrar porque el
 * navegador no quiso dar la posición.
 */

export interface Ubicacion {
  lat: number;
  lon: number;
}

/** Más que esto y el cobrador ya está esperando de gusto. */
const TIMEOUT_MS = 8000;

export async function obtenerUbicacion(): Promise<Ubicacion | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      // Permiso denegado, sin señal o timeout: todos terminan igual, sin ubicación.
      () => resolve(null),
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}
