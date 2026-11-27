/**
 * Utilidades del hilo de mensajes que comparten los chats (redes hoy; WhatsApp cuando lo adopte):
 * separadores de día, hora de cada mensaje en el idioma del usuario y la regla de «bajar al final
 * solo si el asesor ya estaba abajo».
 *
 * Funciones puras, sin Angular: quien las usa les pasa el idioma (`translate.currentLang`) y los textos
 * ya traducidos de «Hoy» y «Ayer».
 */

/** Separador de día dentro del hilo. */
export interface SeparadorDia {
  tipo: 'dia';
  /** Año-mes-día local, estable para el `trackBy`. */
  clave: string;
  etiqueta: string;
}

/** Mensaje dentro del hilo; `agrupado` = viene justo después de otro del mismo lado y del mismo día. */
export interface MensajeEnFeed<T> {
  tipo: 'mensaje';
  mensaje: T;
  agrupado: boolean;
}

export type ItemFeed<T> = SeparadorDia | MensajeEnFeed<T>;

/** Textos ya traducidos para los dos días que no se dicen con fecha. */
export interface TextosDia {
  hoy: string;
  ayer: string;
}

/** Distancia al final (px) con la que se considera que el asesor está leyendo lo último. */
export const MARGEN_FINAL_PX = 80;

const MS_DIA = 24 * 60 * 60 * 1000;

function aFecha(valor: string | number | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const d = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** El idioma de la pantalla o, si el navegador no lo reconoce, el suyo propio. */
function conIdioma<R>(idioma: string | null | undefined, usar: (locale: string | undefined) => R): R {
  try {
    return usar(idioma || undefined);
  } catch {
    return usar(undefined);
  }
}

/**
 * Nombre del día para el separador: «Hoy», «Ayer», el día de la semana si fue esta semana
 * («Miércoles») o la fecha corta («lun, 15 jun»; con año si no es el actual).
 */
export function etiquetaDia(fecha: Date, idioma: string | null | undefined, textos: TextosDia, ahora: Date = new Date()): string {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const diferencia = Math.round((hoy.getTime() - dia.getTime()) / MS_DIA);
  if (diferencia === 0) return textos.hoy;
  if (diferencia === 1) return textos.ayer;
  if (diferencia > 1 && diferencia < 7) {
    const nombre = conIdioma(idioma, (l) => dia.toLocaleDateString(l, { weekday: 'long' }));
    return nombre.charAt(0).toLocaleUpperCase() + nombre.slice(1);
  }
  const opciones: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  if (dia.getFullYear() !== hoy.getFullYear()) opciones.year = 'numeric';
  return conIdioma(idioma, (l) => dia.toLocaleDateString(l, opciones));
}

/** Hora del mensaje («3:45 p. m.» en español, «3:45 PM» en inglés). Vacío si la fecha no sirve. */
export function formatoHora(valor: string | number | Date | null | undefined, idioma: string | null | undefined): string {
  const d = aFecha(valor);
  if (!d) return '';
  return conIdioma(idioma, (l) => d.toLocaleTimeString(l, { hour: 'numeric', minute: '2-digit' }));
}

/**
 * Arma el hilo con un separador cada vez que cambia el día (en la hora local del navegador). Los mensajes
 * sin fecha válida quedan en el día del anterior, sin separador propio. `ladoDe` (opcional) marca como
 * `agrupado` el mensaje que sigue a otro del mismo lado dentro del mismo día.
 */
export function agruparPorDia<T>(
  mensajes: readonly T[],
  fechaDe: (m: T) => string | number | Date | null | undefined,
  idioma: string | null | undefined,
  textos: TextosDia,
  ladoDe?: (m: T) => string,
): ItemFeed<T>[] {
  const items: ItemFeed<T>[] = [];
  const ahora = new Date();
  let ultimaClave = '';
  let ultimoLado: string | null = null;

  for (const mensaje of mensajes || []) {
    const fecha = aFecha(fechaDe(mensaje));
    if (fecha) {
      const clave = claveDia(fecha);
      if (clave !== ultimaClave) {
        items.push({ tipo: 'dia', clave, etiqueta: etiquetaDia(fecha, idioma, textos, ahora) });
        ultimaClave = clave;
        ultimoLado = null;
      }
    }
    const lado = ladoDe ? ladoDe(mensaje) : null;
    const agrupado = lado !== null && lado === ultimoLado;
    items.push({ tipo: 'mensaje', mensaje, agrupado });
    ultimoLado = lado;
  }
  return items;
}

/**
 * ¿El asesor está mirando el final de la caja de mensajes? Se pregunta ANTES de pintar lo nuevo: si
 * estaba abajo, lo nuevo lo baja; si subió a leer, se le deja donde está. Sin caja todavía, sí.
 */
export function cercaDelFinal(caja: HTMLElement | null | undefined, margen = MARGEN_FINAL_PX): boolean {
  if (!caja) return true;
  return caja.scrollHeight - caja.scrollTop - caja.clientHeight <= margen;
}

export function esSeparadorDia<T>(item: ItemFeed<T>): item is SeparadorDia {
  return item.tipo === 'dia';
}

export function esMensajeEnFeed<T>(item: ItemFeed<T>): item is MensajeEnFeed<T> {
  return item.tipo === 'mensaje';
}
