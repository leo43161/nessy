// Relativo y con extensión: este archivo corre también fuera del bundler,
// desde `npm run check` (ver sms.check.ts).
import type { EstadoDeCuenta } from "@/types";

/**
 * El resumen de cuenta por mensaje de texto.
 *
 * **Sí, hay límite, y es más chico de lo que parece.** Un SMS entra en 160
 * caracteres, pero solo si todo el texto está en el alfabeto GSM-7. Si aparece
 * un solo carácter que no esté en ese alfabeto, el mensaje entero pasa a
 * UCS-2 y la capacidad **cae a 70**. Y cuando no entra en uno solo, el
 * teléfono lo parte en varios que se cobran por separado: 153 caracteres cada
 * uno en GSM-7, 67 en UCS-2.
 *
 * La trampa está en los acentos. El alfabeto GSM-7 incluye `é è à ì ò ù ñ ü ö
 * ä ç ß`, pero **NO incluye `á í ó ú`**. O sea que la palabra "próxima" —una
 * sola o— tira todo el mensaje a 70 caracteres por pieza y lo puede triplicar
 * de precio.
 *
 * Por eso este archivo no arma el texto y ya: transcribe los acentos que no
 * entran, cuenta las piezas de verdad, y la pantalla se lo muestra al cobrador
 * antes de mandar.
 */

/**
 * El alfabeto GSM-7 básico (GSM 03.38). Cada carácter de acá ocupa 1.
 *
 * Está escrito entero y a mano a propósito: la lista es la especificación, y
 * deducirla con un rango o una expresión regular deja afuera justo los casos
 * raros —la ¿, la ¡, la ß— que son los que rompen la cuenta sin avisar.
 */
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/** Estos también entran, pero ocupan 2 porque van con un carácter de escape. */
const GSM7_EXTENDIDO = "^{}\\[~]|€";

/** Qué poner en lugar de lo que no entra. Lo demás se resuelve sacando tildes. */
const REEMPLAZOS: Record<string, string> = {
  "á": "a", "í": "i", "ó": "o", "ú": "u",
  "Á": "A", "Í": "I", "Ó": "O", "Ú": "U",
  "–": "-", "—": "-", "…": "...", "«": '"', "»": '"',
  "“": '"', "”": '"', "‘": "'", "’": "'",
};

/** ¿Todo el texto entra en el alfabeto de 160? */
export function esGsm7(texto: string): boolean {
  for (const c of texto) {
    if (!GSM7.includes(c) && !GSM7_EXTENDIDO.includes(c)) return false;
  }
  return true;
}

/**
 * Deja el texto en el alfabeto de 160, cambiando lo mínimo.
 *
 * Primero los reemplazos conocidos, y a lo que quede se le sacan las tildes
 * con `normalize`. Los que ya entran —é, ñ, ü— **no se tocan**: cambiarlos no
 * ahorraría nada y el mensaje se leería peor.
 */
export function aGsm7(texto: string): string {
  let salida = "";

  for (const c of texto) {
    if (GSM7.includes(c) || GSM7_EXTENDIDO.includes(c)) {
      salida += c;
      continue;
    }

    if (REEMPLAZOS[c]) {
      salida += REEMPLAZOS[c];
      continue;
    }

    // Sin tilde. Si aun así no entra, se descarta: un carácter suelto no vale
    // multiplicar por dos el costo de todo el mensaje.
    const sinTilde = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
    salida += esGsm7(sinTilde) ? sinTilde : "";
  }

  return salida;
}

export interface MedidaSms {
  caracteres: number;
  /** Cuántos mensajes se van a mandar de verdad — y cuántos se cobran */
  piezas: number;
  /** Cuánto falta para que entre una pieza más */
  restantes: number;
  alfabeto: "GSM-7" | "UCS-2";
}

/**
 * Cuántos mensajes son en realidad.
 *
 * Los de una sola pieza usan la capacidad completa; en cuanto hay que partir,
 * cada pieza pierde lugar por la cabecera que las une (7 caracteres en GSM-7,
 * 3 en UCS-2).
 */
export function medirSms(texto: string): MedidaSms {
  const gsm = esGsm7(texto);

  // En GSM-7 los del set extendido ocupan dos lugares.
  const largo = gsm
    ? [...texto].reduce((n, c) => n + (GSM7_EXTENDIDO.includes(c) ? 2 : 1), 0)
    : [...texto].length;

  const simple = gsm ? 160 : 70;
  const multiple = gsm ? 153 : 67;

  const piezas = largo === 0 ? 0 : largo <= simple ? 1 : Math.ceil(largo / multiple);
  const tope = piezas <= 1 ? simple : piezas * multiple;

  return {
    caracteres: largo,
    piezas,
    restantes: Math.max(0, tope - largo),
    alfabeto: gsm ? "GSM-7" : "UCS-2",
  };
}

/**
 * El resumen, corto.
 *
 * **No es el mismo texto que va por WhatsApp.** Aquel lista plan por plan y
 * usa `*` para las negritas; acá los asteriscos se verían tal cual, y el
 * detalle multiplicaría el costo por cinco. Va lo que el cliente necesita para
 * saber si tiene que pagar y cuánto: lo que debe, lo vencido y la próxima
 * cuota. El detalle sigue estando en el PDF.
 */
export function resumenParaSms(ec: EstadoDeCuenta, empresa: string): string {
  const lineas: string[] = [empresa, ec.clienteNombre];

  lineas.push(`Debe: ${pesos(ec.saldoPendiente)}`);

  if (ec.totalVencido > 0) {
    lineas.push(`VENCIDO: ${pesos(ec.totalVencido)}`);
  }

  // La próxima de todas: el cliente quiere saber cuándo le toca, no cuál plan.
  const proxima = ec.planes
    .map((p) => p.proximaCuota)
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

  if (proxima) {
    lineas.push(`Prox: ${pesos(proxima.monto)} el ${diaMes(proxima.fecha)}`);
  }

  lineas.push("Consultas: tu cobrador");

  return aGsm7(lineas.join("\n"));
}

/** "45000" → "$45.000". Sin centavos: en un SMS ocupan cuatro lugares y no dicen nada. */
function pesos(monto: number): string {
  return "$" + Math.round(monto).toLocaleString("es-AR");
}

/** "2026-08-26" → "26/08" */
function diaMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

/**
 * El enlace que abre la app de mensajes del teléfono.
 *
 * ⚠️ **iOS y Android no usan el mismo separador.** El estándar (RFC 5724) dice
 * `?body=`, que es lo que entiende Android; iOS quiere `&body=`. Con el
 * separador equivocado la app abre igual pero **el mensaje viene vacío**, y el
 * cobrador no tiene forma de darse cuenta de por qué.
 *
 * Sin número, abre el redactor sin destinatario: sirve para elegir el contacto
 * a mano.
 */
export function enlaceSms(numero: string | null, cuerpo: string): string {
  const esIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPadOS 13+ se presenta como Mac; lo delata el touch.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  const separador = esIOS ? "&" : "?";
  const destino = numero ? numero.replace(/[^\d+]/g, "") : "";

  return `sms:${destino}${separador}body=${encodeURIComponent(cuerpo)}`;
}
