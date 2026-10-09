/**
 * Ticket 1155 (ALMARA): el PDF de la tarjeta no traía los emojis.
 *
 * jsPDF escribe con la fuente Times del PDF, que no tiene emojis, y por eso antes se
 * borraban (y de paso la ü y cualquier letra fuera de ASCII y las vocales con tilde).
 * Aquí el texto de la tarjeta (Para / mensaje / De) se arma como HTML con la misma
 * tipografía y ancho, se rasteriza y se pone como imagen en la misma zona del PDF:
 * los emojis salen a color y no se pierde ninguna letra. El pie pre-impreso no se toca.
 */
import { escaparHtml } from './escapar-html';
import { conTope, crearDocumentoAislado } from './impresion-aislada';

export interface TarjetaRegalo {
  para?: string;
  mensaje?: string;
  de?: string;
}

export interface ImagenTarjeta {
  dataUrl: string;
  anchoCm: number;
  altoCm: number;
}

/** Ancho del texto sobre la tarjeta (cm); es el mismo con el que se partían las líneas. */
export const ANCHO_TEXTO_CM = 12;
export const FUENTE_BASE_PT = 12;
export const FUENTE_MIN_PT = 7;
const PX_POR_CM = 96 / 2.54;
const ESCALA_RASTER = 3;
const ESPERA_RASTER_MS = 20000;
const ID_BLOQUE = 'tarjeta-regalo';

/**
 * Cada palabra con la primera letra en mayúscula, también si empieza con tilde, ñ, paréntesis
 * o un emoji ("(mamá)" → "(Mamá)"). Una palabra que empieza con número ("3ra") no se toca.
 */
export function tituloPropio(texto: string): string {
  if (!texto) return '';
  return texto.replace(/\S+/g, (palabra) => {
    const letras = Array.from(palabra.toLowerCase());
    for (let i = 0; i < letras.length; i++) {
      if (/\d/.test(letras[i])) break;
      if (letras[i].toUpperCase() !== letras[i]) {
        letras[i] = letras[i].toUpperCase();
        break;
      }
    }
    return letras.join('');
  });
}

/**
 * HTML del texto de la tarjeta, o '' si no trae nada. Los espaciados se miden en cm y
 * escalan con --k (fuente actual / 12 pt), igual que cuando se reducía la fuente en jsPDF.
 */
export function armarHtmlTarjeta(tarjeta: TarjetaRegalo): string {
  const hay = (valor?: string) => !!valor && valor.trim() !== '';
  const bloques: string[] = [];
  if (hay(tarjeta?.para)) {
    bloques.push(
      '<div class="etiqueta">Para:</div>' +
        `<div class="nombre">${escaparHtml(tituloPropio(tarjeta.para!))}</div>`,
    );
  }
  if (hay(tarjeta?.mensaje)) {
    bloques.push(`<div class="mensaje">${escaparHtml(tarjeta.mensaje!.trim())}</div>`);
  }
  if (hay(tarjeta?.de)) {
    bloques.push(
      '<div class="etiqueta">De:</div>' + `<div class="nombre">${escaparHtml(tituloPropio(tarjeta.de!))}</div>`,
    );
  }
  if (!bloques.length) return '';
  return `<style>
    #${ID_BLOQUE} { --k: 1; width: ${ANCHO_TEXTO_CM}cm; text-align: center; color: #000; font-style: italic;
      font-family: 'Times New Roman', Times, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', serif;
      font-size: calc(var(--k) * ${FUENTE_BASE_PT}pt); overflow-wrap: anywhere; white-space: pre-line; }
    #${ID_BLOQUE} .etiqueta, #${ID_BLOQUE} .nombre { line-height: calc(var(--k) * 0.6cm); }
    #${ID_BLOQUE} .nombre { margin-bottom: calc(var(--k) * 0.3cm); }
    #${ID_BLOQUE} .mensaje { line-height: calc(var(--k) * 0.5cm); margin-bottom: calc(var(--k) * 0.8cm); }
  </style><div id="${ID_BLOQUE}">${bloques.join('')}</div>`;
}

/** Reduce la fuente, y con ella los espaciados, hasta que el bloque quepa en `altoMaxCm`. */
function ajustarAlto(bloque: HTMLElement, altoMaxCm: number): void {
  const altoCm = () => bloque.getBoundingClientRect().height / PX_POR_CM;
  let fuente = FUENTE_BASE_PT;
  while (altoCm() > altoMaxCm && fuente > FUENTE_MIN_PT) {
    fuente = Math.max(FUENTE_MIN_PT, fuente - 0.5);
    bloque.style.setProperty('--k', String(fuente / FUENTE_BASE_PT));
  }
}

/**
 * Rasteriza el texto de la tarjeta en un documento aislado (no clona la página, así que
 * no depende de las imágenes que tenga cargadas). null si la tarjeta no trae texto.
 */
export async function rasterizarTarjeta(tarjeta: TarjetaRegalo, altoMaxCm: number): Promise<ImagenTarjeta | null> {
  const contenido = armarHtmlTarjeta(tarjeta);
  if (!contenido) return null;
  const { default: html2canvas } = await import('html2canvas');
  const aislado = await crearDocumentoAislado(contenido, 'Tarjeta');
  try {
    const bloque = aislado.doc.getElementById(ID_BLOQUE) as HTMLElement;
    ajustarAlto(bloque, altoMaxCm);
    const caja = bloque.getBoundingClientRect();
    const canvas = await conTope(
      html2canvas(bloque, { scale: ESCALA_RASTER, backgroundColor: null, logging: false }),
      ESPERA_RASTER_MS,
      'tarjeta',
    );
    return { dataUrl: canvas.toDataURL('image/png'), anchoCm: caja.width / PX_POR_CM, altoCm: caja.height / PX_POR_CM };
  } finally {
    aislado.destruir();
  }
}
