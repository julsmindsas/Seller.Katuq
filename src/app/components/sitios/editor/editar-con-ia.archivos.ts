/**
 * Archivos que el comercio le muestra a la IA del editor: fotos, capturas y PDF.
 *
 * Todo se prepara EN EL NAVEGADOR antes de enviarlo:
 *  - una foto se reduce a 1.600 px por el lado mayor, en JPEG (una captura de 4 MB queda en ~400 KB);
 *  - un PDF se convierte en imágenes, una por página (las primeras 3), con pdf.js, que se carga solo
 *    cuando alguien adjunta un PDF. El servidor no tiene con qué abrir un PDF (verificado el 9-oct).
 */

export const LADO_MAXIMO = 1600;
export const CALIDAD_JPEG = 0.82;
export const PAGINAS_PDF = 3;

/** Carga una imagen (File o data URL) en un elemento <img>. */
function cargarImagen(origen: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
    img.src = origen;
  });
}

function leerComoDataUrl(archivo: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result || ''));
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(archivo);
  });
}

/** Dibuja en un lienzo a lo sumo de `ladoMaximo` y lo devuelve como JPEG (fondo blanco para las PNG). */
function lienzoAJpeg(fuente: CanvasImageSource, ancho: number, alto: number, ladoMaximo = LADO_MAXIMO): string {
  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));
  const w = Math.max(1, Math.round(ancho * escala));
  const h = Math.max(1, Math.round(alto * escala));
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo preparar la imagen.');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(fuente, 0, 0, w, h);
  return lienzo.toDataURL('image/jpeg', CALIDAD_JPEG);
}

/** Una foto o captura, reducida y en JPEG, lista para enviar. */
export async function reducirImagen(archivo: Blob): Promise<string> {
  const original = await leerComoDataUrl(archivo);
  const img = await cargarImagen(original);
  return lienzoAJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
}

/** Las primeras páginas de un PDF como imágenes JPEG. */
export async function pdfAImagenes(archivo: Blob, maxPaginas = PAGINAS_PDF): Promise<string[]> {
  // Se carga solo aquí: el resto del editor no paga el peso de pdf.js.
  // @ts-ignore — la versión legacy no trae tipos para este camino de importación.
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.js';
  const datos = new Uint8Array(await archivo.arrayBuffer());
  const documento = await pdfjs.getDocument({ data: datos }).promise;
  const imagenes: string[] = [];
  const total = Math.min(documento.numPages, maxPaginas);
  for (let n = 1; n <= total; n++) {
    const pagina = await documento.getPage(n);
    const base = pagina.getViewport({ scale: 1 });
    const escala = Math.min(2, LADO_MAXIMO / Math.max(base.width, base.height));
    const vista = pagina.getViewport({ scale: escala });
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(vista.width);
    lienzo.height = Math.round(vista.height);
    const ctx = lienzo.getContext('2d');
    if (!ctx) throw new Error('El navegador no pudo preparar el PDF.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    await pagina.render({ canvasContext: ctx, viewport: vista }).promise;
    imagenes.push(lienzo.toDataURL('image/jpeg', CALIDAD_JPEG));
  }
  if (typeof documento.destroy === 'function') documento.destroy();
  return imagenes;
}
