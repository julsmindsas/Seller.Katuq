import { AvisoCalidad, Grises, avisosDeCalidad, grisDe, medidasParaCalidad, varianzaLaplaciano } from './photo-quality';

/**
 * Aviso de calidad al subir una foto — la parte que usa el DOM (D-501). Lee la foto en un canvas,
 * la reduce a 512 px y saca los grises; el cálculo es el puro de `photo-quality.ts` (el mismo del
 * servidor). Es orientativo: si el navegador no puede leer la foto, no avisa nada. Nunca bloquea.
 */
export async function medirCalidadDeArchivo(archivo: Blob): Promise<{ minSide: number; laplacianVariance: number; warnings: AvisoCalidad[] } | null> {
  if (typeof document === 'undefined' || !archivo) {
    return null;
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = await cargarImagen(url);
    const ancho = img.naturalWidth || img.width;
    const alto = img.naturalHeight || img.height;
    if (!ancho || !alto) {
      return null;
    }
    const grises = grisesDe(img, ancho, alto);
    if (!grises) {
      return null;
    }
    const minSide = Math.min(ancho, alto);
    const laplacianVariance = varianzaLaplaciano(grises);
    return { minSide, laplacianVariance, warnings: avisosDeCalidad({ minSide, laplacianVariance }) };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cargarImagen(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('foto ilegible'));
    img.src = url;
  });
}

function grisesDe(img: HTMLImageElement, ancho: number, alto: number): Grises | null {
  const m = medidasParaCalidad(ancho, alto);
  const canvas = document.createElement('canvas');
  canvas.width = m.width;
  canvas.height = m.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, m.width, m.height);
  ctx.drawImage(img, 0, 0, m.width, m.height);
  const rgba = ctx.getImageData(0, 0, m.width, m.height).data;
  const data = new Uint8Array(m.width * m.height);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = grisDe(rgba[p], rgba[p + 1], rgba[p + 2]);
  }
  return { width: m.width, height: m.height, data };
}
