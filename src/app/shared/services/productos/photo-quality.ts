/**
 * Aviso de calidad de una foto de producto — parte PURA (D-501, ticket 1252).
 *
 * Solo informa; nunca impide guardar ni usar la foto:
 *  - `low_resolution`: el lado menor mide menos de 600 px;
 *  - `blurry`: la varianza del laplaciano en grises (foto reducida a 512 px) es menor de 100.
 *
 * Es el MISMO cálculo del servidor (functions/utils/productPhotoUniform.js). La paridad se prueba
 * con `photo-quality-vectors.v1.json`, idéntico en los dos repos. Sacar los grises de una foto usa
 * el DOM y vive aparte (`photo-quality-canvas.ts`), fuera de las pruebas con node.
 */

export const UMBRALES_CALIDAD = Object.freeze({ lowResolutionMinSide: 600, blurryLaplacian: 100 });

/** Lado mayor al que se reduce la foto antes de medir la nitidez. */
export const LADO_CALIDAD = 512;

export type AvisoCalidad = 'low_resolution' | 'blurry';

export interface Grises {
  width: number;
  height: number;
  /** Un valor 0-255 por píxel, fila por fila. */
  data: ArrayLike<number>;
}

/**
 * Varianza del laplaciano de 4 vecinos sobre grises enteros, solo píxeles interiores.
 * 0 si un lado mide menos de 3. Redondeo a 4 decimales.
 */
export function varianzaLaplaciano(grises: Grises): number {
  const w = Number(grises && grises.width) || 0;
  const h = Number(grises && grises.height) || 0;
  const d = grises && grises.data;
  if (w < 3 || h < 3 || !d || d.length < w * h) {
    return 0;
  }
  let suma = 0;
  let sumaCuadrados = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = d[i - 1] + d[i + 1] + d[i - w] + d[i + w] - 4 * d[i];
      suma += l;
      sumaCuadrados += l * l;
      n++;
    }
  }
  const media = suma / n;
  return Math.round((sumaCuadrados / n - media * media) * 10000) / 10000;
}

/** Avisos informativos, en el mismo orden que el servidor. */
export function avisosDeCalidad(
  medida: { minSide: number; laplacianVariance: number },
  umbrales = UMBRALES_CALIDAD,
): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];
  if (Number(medida.minSide) < umbrales.lowResolutionMinSide) {
    avisos.push('low_resolution');
  }
  if (Number(medida.laplacianVariance) < umbrales.blurryLaplacian) {
    avisos.push('blurry');
  }
  return avisos;
}

/** Gris entero de un píxel RGB (luma Rec. 601). */
export function grisDe(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/** Medidas a las que se reduce una foto para medir la nitidez (sin agrandar). */
export function medidasParaCalidad(ancho: number, alto: number): { width: number; height: number } {
  const mayor = Math.max(ancho, alto);
  if (!mayor || mayor <= LADO_CALIDAD) {
    return { width: Math.max(0, Math.round(ancho)), height: Math.max(0, Math.round(alto)) };
  }
  const escala = LADO_CALIDAD / mayor;
  return { width: Math.max(1, Math.round(ancho * escala)), height: Math.max(1, Math.round(alto * escala)) };
}

/** Texto corto del aviso para la persona (sin jerga). El umbral del texto sigue al que se midió. */
export function textoDeAvisos(avisos: AvisoCalidad[], umbrales = UMBRALES_CALIDAD): string {
  const partes: string[] = [];
  if (avisos.includes('low_resolution')) {
    partes.push(`se ve pequeña (menos de ${umbrales.lowResolutionMinSide} px de lado)`);
  }
  if (avisos.includes('blurry')) {
    partes.push('parece borrosa');
  }
  if (!partes.length) {
    return '';
  }
  return `Esta foto ${partes.join(' y ')}. Puedes guardarla igual; con una foto más nítida y grande el producto se ve mejor.`;
}

// ---------------------------------------------------------------------------------------------
// Estándar de foto de producto (D-629, tickets 1426 y 1427, fase 1: solo los mensajes al subir)
// ---------------------------------------------------------------------------------------------
// Con la bandera `fotosEstandar` apagada nada de esto se usa y el umbral de «foto pequeña» sigue
// siendo el de D-501 (600 px, `UMBRALES_CALIDAD`, con paridad en el servidor). Encendida, el
// mínimo es 800 px. Todo es puro (sin DOM): leer el tamaño de la foto lo hace quien llama.

/** Peso máximo, mínimo y relación de la foto de producto. */
export const ESTANDAR_FOTO = Object.freeze({
  maxBytes: 15 * 1024 * 1024,
  minLado: 800,
  recomendado: 1200,
  /** Una foto se considera alejada de 1:1 si su lado mayor supera 4/3 del menor. */
  relacionMaxima: Object.freeze({ mayor: 4, menor: 3 }),
});

/** Umbrales de calidad con el mínimo del estándar (800 px), para cuando `fotosEstandar` está encendida. */
export const UMBRALES_CALIDAD_ESTANDAR = Object.freeze({
  lowResolutionMinSide: ESTANDAR_FOTO.minLado,
  blurryLaplacian: UMBRALES_CALIDAD.blurryLaplacian,
});

/** Mensaje único del estándar. No dice que el sistema convierta nada. */
export const MENSAJE_ESTANDAR_FOTO =
  'Formato sugerido: WebP. Tamaño recomendado: foto cuadrada de 1200 × 1200 px (mínimo 800 × 800). ' +
  'Peso máximo: 15 MB. Producto centrado, buena luz y fondo limpio.';

export type RechazoFoto = 'pesada' | 'ilegible';
export type AvisoEstandar = 'pequena' | 'no_cuadrada';

export interface EvaluacionFoto {
  /** Si no es null, la foto no se agrega; las demás siguen. */
  rechazo: RechazoFoto | null;
  /** Avisos suaves: la foto se agrega igual. */
  avisos: AvisoEstandar[];
}

/**
 * Evalúa una foto contra el estándar. `ancho` y `alto` son los que leyó el navegador; si no pudo
 * leerla (`legible` falso, o sin medidas) la foto se rechaza como ilegible. El peso se revisa
 * primero: una foto de 18 MB se rechaza por pesada aunque se pueda leer.
 */
export function evaluarFotoEstandar(foto: {
  bytes: number;
  ancho?: number | null;
  alto?: number | null;
  legible: boolean;
}): EvaluacionFoto {
  if (Number(foto.bytes) > ESTANDAR_FOTO.maxBytes) {
    return { rechazo: 'pesada', avisos: [] };
  }
  const ancho = Number(foto.ancho) || 0;
  const alto = Number(foto.alto) || 0;
  if (!foto.legible || ancho <= 0 || alto <= 0) {
    return { rechazo: 'ilegible', avisos: [] };
  }
  const avisos: AvisoEstandar[] = [];
  const menor = Math.min(ancho, alto);
  const mayor = Math.max(ancho, alto);
  if (menor < ESTANDAR_FOTO.minLado) {
    avisos.push('pequena');
  }
  // Enteros, sin dividir: 4000 × 3000 es justo 4:3 y no avisa.
  if (mayor * ESTANDAR_FOTO.relacionMaxima.menor > menor * ESTANDAR_FOTO.relacionMaxima.mayor) {
    avisos.push('no_cuadrada');
  }
  return { rechazo: null, avisos };
}

/**
 * Peso en MB para el mensaje: sin decimales si es entero, con una coma decimal si no («18 MB»,
 * «15,3 MB»). Se redondea hacia arriba, así una foto que pasa del máximo nunca dice «15 MB».
 */
export function pesoEnMb(bytes: number): string {
  const mb = Math.ceil((Number(bytes) / (1024 * 1024)) * 10) / 10;
  return Number.isInteger(mb) ? String(mb) : String(mb).replace('.', ',');
}

/** Mensaje del rechazo: dice el motivo y qué hacer. */
export function mensajeDeRechazo(rechazo: RechazoFoto, bytes = 0): string {
  if (rechazo === 'pesada') {
    return `Esta foto pesa ${pesoEnMb(bytes)} MB y el máximo es 15 MB. Reduce su tamaño o sube otra.`;
  }
  return 'No pudimos leer este archivo como foto. Sube una imagen JPG, PNG, WebP u otra foto común.';
}

/** Mensaje del aviso suave. */
export function mensajeDeAviso(aviso: AvisoEstandar): string {
  return aviso === 'pequena'
    ? 'Esta foto es pequeña y puede verse borrosa.'
    : 'Para mejores resultados usa una foto cuadrada.';
}
