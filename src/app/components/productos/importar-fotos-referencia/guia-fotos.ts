import { ESTANDAR_FOTO } from '../../../shared/services/productos/photo-quality';

/**
 * Guía imprimible del estándar de foto de producto (ticket 1516, D-629). Se genera en el navegador:
 * las cifras salen de `ESTANDAR_FOTO` para no contradecir los avisos de la subida, y el nombre del
 * archivo es el de «Importar fotos de productos» (artículo «Cómo subir y ordenar las fotos»).
 */
export function htmlGuiaFotos(empresa = ''): string {
  const mb = Math.round(ESTANDAR_FOTO.maxBytes / (1024 * 1024));
  const nombre = String(empresa || '').replace(/[&<>"']/g, '');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Guía de fotos de producto</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #211F3A; background: #fff; margin: 0; padding: 32px 20px; line-height: 1.5; }
  main { max-width: 720px; margin: 0 auto; }
  .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #6B6985; }
  h1 { font-size: 26px; margin: 4px 0 6px; }
  h2 { font-size: 16px; margin: 24px 0 8px; color: #5F3FE0; }
  p, li { font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { text-align: left; font-size: 14px; padding: 8px 10px; border-bottom: 1px solid #E6E1FA; vertical-align: top; }
  th { width: 34%; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #6B6985; }
  code { background: #F3F0FF; border-radius: 6px; padding: 1px 6px; font-size: 13px; }
  .no { color: #B42318; }
  button { margin-top: 24px; background: #5F3FE0; color: #fff; border: 0; border-radius: 11px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; }
  @media print { button { display: none; } body { padding: 0; } }
</style></head><body><main>
<div class="eyebrow">Katuq${nombre ? ' · ' + nombre : ''}</div>
<h1>Guía de fotos de producto</h1>
<p>Con fotos parejas tu catálogo y tu tienda se ven mejor. Esto es lo que revisa Katuq al subirlas.</p>
<h2>El estándar</h2>
<table>
  <tr><th>Formato</th><td>Sugerido: WebP. También sirven JPG y PNG.</td></tr>
  <tr><th>Forma</th><td>Cuadrada (1:1). Si no lo es, Katuq la sube igual y te avisa.</td></tr>
  <tr><th>Tamaño</th><td>Recomendado ${ESTANDAR_FOTO.recomendado} × ${ESTANDAR_FOTO.recomendado} px. Mínimo ${ESTANDAR_FOTO.minLado} × ${ESTANDAR_FOTO.minLado} px; por debajo se avisa que puede verse borrosa.</td></tr>
  <tr><th>Peso</th><td>Máximo ${mb} MB por foto. Una foto más pesada, o que no se pueda leer, no se agrega.</td></tr>
  <tr><th>Fondo y luz</th><td>Producto centrado, buena luz y fondo limpio (blanco o liso).</td></tr>
</table>
<h2>Cómo nombrar el archivo (Importar fotos de productos)</h2>
<p>Cada foto va al producto cuya referencia lleva en el nombre.</p>
<ul>
  <li><code>ALM-4789.jpg</code>: foto principal del producto ALM-4789.</li>
  <li><code>ALM-4789-1.jpg</code>, <code>ALM-4789-2.jpg</code>: más fotos, en ese orden.</li>
  <li>Mayúsculas o minúsculas dan igual.</li>
</ul>
<p class="no">No se reconocen: espacio en vez del guion (<code>ALM 4789.jpg</code>), texto extra (<code>ALM-4789 rojo.jpg</code>), guion bajo (<code>ALM-4789_1.jpg</code>), ceros que la referencia no tiene y copias de Windows (<code>ALM-4789 (1).jpg</code>).</p>
<p>Tip: en «Importar fotos de productos», «Descargar ejemplo con tus referencias» te da el nombre exacto de cada foto.</p>
<button type="button" onclick="window.print()">Imprimir o guardar como PDF</button>
</main></body></html>`;
}

/** Abre la guía en una pestaña lista para imprimir; si el navegador bloquea la ventana, la descarga. */
export function abrirGuiaFotos(empresa = ''): void {
  const blob = new Blob([htmlGuiaFotos(empresa)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const ventana = window.open(url, '_blank');
  if (!ventana) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guia-de-fotos-de-producto.html';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
