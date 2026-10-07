/**
 * Ticket 1151 (ALMACEN BOMBAS): imprimir o descargar un documento (pedido, guía...)
 * sin depender de la página donde se abre.
 *
 * Antes, html2canvas rasterizaba el DOM vivo: clona TODA la página y espera a que
 * carguen TODAS sus imágenes, sin límite de tiempo. Con una sola imagen que nunca
 * respondía (carga diferida, mapas, un servidor caído) el botón se quedaba en
 * "Generando PDF..." para siempre.
 *
 * Aquí el documento vive solo en un iframe oculto, se esperan únicamente sus
 * imágenes con tope y cada paso tiene límite de tiempo: siempre termina.
 */
import { escaparHtml } from './escapar-html';

/** Ancho de una hoja A4 a 96 dpi; es el ancho con el que se arma el documento. */
const ANCHO_A4_PX = 794;
/** Tope para esperar las imágenes del documento antes de imprimir o rasterizar. */
export const ESPERA_IMAGENES_MS = 8000;
/** Tope para que el iframe cargue el documento. */
const ESPERA_CARGA_MS = 5000;
/** Si el navegador no avisa que terminó de imprimir, el iframe se limpia igual. */
const LIMPIEZA_IFRAME_MS = 10 * 60 * 1000;
const ATRIBUTO_IFRAME = 'data-katuq-impresion';

export class TiempoAgotadoError extends Error {
  constructor(public readonly paso: string) {
    super(`Tiempo agotado: ${paso}`);
    this.name = 'TiempoAgotadoError';
  }
}

export interface DocumentoAislado {
  iframe: HTMLIFrameElement;
  doc: Document;
  destruir(): void;
}

/** Resuelve con la promesa o rechaza con TiempoAgotadoError si pasa `ms`. */
export function conTope<T>(promesa: Promise<T>, ms: number, paso: string): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout>;
  const tope = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new TiempoAgotadoError(paso)), ms);
  });
  return Promise.race([promesa, tope]).finally(() => clearTimeout(temporizador));
}

/** Documento completo para el iframe: el contenido tal cual se ve en la vista previa. */
export function armarDocumento(contenido: string, titulo: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escaparHtml(titulo)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    img { max-width: 100%; height: auto; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>${contenido}</body>
</html>`;
}

/**
 * Espera a que las imágenes del documento carguen o fallen, como máximo `maxMs`.
 * Nunca rechaza: si una imagen no responde, se sigue sin ella.
 */
export async function esperarImagenes(doc: Document, maxMs: number = ESPERA_IMAGENES_MS): Promise<void> {
  const imagenes = Array.from(doc.images || []);
  // En un iframe oculto la carga diferida no arranca nunca.
  imagenes.forEach((img) => {
    if (img.loading === 'lazy') img.loading = 'eager';
  });
  const pendientes = imagenes.filter((img) => !img.complete && !!img.getAttribute('src'));
  if (!pendientes.length) return;
  const todas = Promise.all(
    pendientes.map(
      (img) =>
        new Promise<void>((resolver) => {
          img.addEventListener('load', () => resolver(), { once: true });
          img.addEventListener('error', () => resolver(), { once: true });
        }),
    ),
  );
  await conTope(todas, maxMs, 'imagenes').catch(() => undefined);
}

/** Arma el documento en un iframe oculto, fuera de la vista y del flujo de la página. */
export async function crearDocumentoAislado(contenido: string, titulo: string): Promise<DocumentoAislado> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute(ATRIBUTO_IFRAME, '');
  // El pedido trae textos que escribe la gente (nombres, notas): sin allow-scripts no
  // corre ningún script ni onerror del contenido. allow-same-origin deja leer el
  // documento desde aquí y allow-modals deja abrir el diálogo de impresión.
  iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${ANCHO_A4_PX}px;height:1123px;` +
    'border:0;pointer-events:none;';

  const cargado = new Promise<void>((resolver) => {
    iframe.addEventListener('load', () => resolver(), { once: true });
  });
  iframe.srcdoc = armarDocumento(contenido, titulo);
  document.body.appendChild(iframe);

  const destruir = () => iframe.parentNode?.removeChild(iframe);
  try {
    await conTope(cargado, ESPERA_CARGA_MS, 'carga');
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) throw new Error('No se pudo preparar el documento');
    await esperarImagenes(doc);
    return { iframe, doc, destruir };
  } catch (error) {
    destruir();
    throw error;
  }
}

/** Quita iframes de impresiones anteriores que el navegador no alcanzó a limpiar. */
function limpiarImpresionesAnteriores(): void {
  document.querySelectorAll(`iframe[${ATRIBUTO_IFRAME}]`).forEach((el) => el.parentNode?.removeChild(el));
}

/**
 * Abre el diálogo de impresión del navegador solo con el documento.
 * Resuelve en cuanto se abre el diálogo; el iframe se limpia al terminar de imprimir.
 */
export async function imprimirAislado(contenido: string, titulo: string): Promise<void> {
  limpiarImpresionesAnteriores();
  const aislado = await crearDocumentoAislado(contenido, titulo);
  const ventana = aislado.iframe.contentWindow;
  if (!ventana) {
    aislado.destruir();
    throw new Error('No se pudo abrir la impresión');
  }
  const limpieza = setTimeout(aislado.destruir, LIMPIEZA_IFRAME_MS);
  ventana.addEventListener(
    'afterprint',
    () => {
      clearTimeout(limpieza);
      aislado.destruir();
    },
    { once: true },
  );
  ventana.focus();
  ventana.print();
}

/**
 * Descarga el documento como PDF (imagen en hojas A4), con tope de tiempo total.
 * Si se agota, rechaza con TiempoAgotadoError y no deja nada colgado.
 */
export async function descargarPdfAislado(
  contenido: string,
  titulo: string,
  nombreArchivo: string,
  maxMs: number = 45000,
): Promise<void> {
  let aislado: DocumentoAislado | null = null;
  let agotado = false;
  // Si se agotó el tiempo, al quitar el iframe html2canvas pierde su clon y se detiene.
  const destruir = () => aislado?.destruir();
  const trabajo = (async () => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    aislado = await crearDocumentoAislado(contenido, titulo);
    if (agotado) return;
    const cuerpo = aislado.doc.body;
    const canvas = await html2canvas(cuerpo, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: ESPERA_IMAGENES_MS,
      width: cuerpo.scrollWidth,
      height: cuerpo.scrollHeight,
      windowWidth: ANCHO_A4_PX,
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const anchoHoja = pdf.internal.pageSize.getWidth();
    const altoHoja = pdf.internal.pageSize.getHeight();
    const altoImagen = anchoHoja / (canvas.width / canvas.height);
    let restante = altoImagen;
    let posicion = 0;
    pdf.addImage(imgData, 'JPEG', 0, posicion, anchoHoja, altoImagen);
    restante -= altoHoja;
    while (restante > 0) {
      posicion -= altoHoja;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, posicion, anchoHoja, altoImagen);
      restante -= altoHoja;
    }
    if (agotado) return;
    pdf.save(nombreArchivo);
  })();
  // Pase lo que pase con el tope, el iframe no queda en la página.
  trabajo.then(destruir, destruir);

  try {
    await conTope(trabajo, maxMs, 'pdf');
  } catch (error) {
    agotado = true;
    destruir();
    throw error;
  }
}
