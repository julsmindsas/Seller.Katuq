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

/** Texto corto del aviso para la persona (sin jerga). */
export function textoDeAvisos(avisos: AvisoCalidad[]): string {
  const partes: string[] = [];
  if (avisos.includes('low_resolution')) {
    partes.push('se ve pequeña (menos de 600 px de lado)');
  }
  if (avisos.includes('blurry')) {
    partes.push('parece borrosa');
  }
  if (!partes.length) {
    return '';
  }
  return `Esta foto ${partes.join(' y ')}. Puedes guardarla igual; con una foto más nítida y grande el producto se ve mejor.`;
}
