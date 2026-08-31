/**
 * Resuelve las URLs de imagen de producto (D-141).
 *
 * Osmosis devuelve rutas **relativas** (`/osmosis/products/0/123/abc.png`) y
 * buena parte del catálogo las tiene guardadas así, sin host, porque se
 * sincronizaron antes de que `osmosisProductSyncService` empezara a guardar la
 * URL completa.
 *
 * Servidas tal cual **no cargan**: el navegador las resuelve contra el propio
 * dominio y el rewrite `** -> /index.html` de Firebase devuelve el HTML de la
 * app (127 KB, `content-type: text/html`) en lugar de la foto, así que el
 * `<img>` falla en silencio y se ve el hueco. Por eso ninguna imagen de
 * producto se veía en el POS ni en el resto del panel.
 */
const CDN_OSMOSIS = 'https://images2.guiacereza.com';

/** Marcador cuando el producto no tiene ninguna foto utilizable. */
export const IMAGEN_PRODUCTO_POR_DEFECTO = 'assets/images/other-images/sinimagen.webp';

/**
 * Convierte una ruta de imagen en URL absoluta.
 * Las que ya son absolutas (Firebase Storage, `data:`) se dejan intactas.
 *
 * `data:` es la que usan las pantallas que muestran una foto ANTES de subirla
 * (la creación rápida de productos y su vista previa). **No se usa `blob:` a
 * propósito**: `URL.createObjectURL()` es lo natural para eso, pero el
 * sanitizador de Angular solo admite los esquemas `https? | mailto | data |
 * ftp | tel | file | sms` (`SAFE_URL_PATTERN` en `@angular/core`), reescribe
 * cualquier `blob:` de un `[src]` a `unsafe:blob:` y la imagen no carga nunca.
 * Agregar `blob:` acá no arregla nada: pasaría este filtro para que Angular lo
 * bloqueara igual, un renglón después.
 */
export function urlImagenAbsoluta(ruta: string | null | undefined): string | null {
  if (!ruta || typeof ruta !== 'string') return null;
  const limpia = ruta.trim();
  if (!limpia) return null;
  if (/^https?:\/\//i.test(limpia) || limpia.startsWith('data:') || limpia.startsWith('//')) {
    return limpia;
  }
  // Las rutas de assets locales tampoco llevan CDN.
  if (limpia.startsWith('assets/') || limpia.startsWith('/assets/')) return limpia;
  return `${CDN_OSMOSIS}${limpia.startsWith('/') ? '' : '/'}${limpia}`;
}

/**
 * Primera foto utilizable de un producto, ya absoluta. Cae a las secundarias
 * si no hay principales, y al marcador si no hay ninguna.
 */
export function imagenDeProducto(producto: any, porDefecto = IMAGEN_PRODUCTO_POR_DEFECTO): string {
  const crear = producto?.crearProducto ?? producto ?? {};
  const candidatas = [
    ...(Array.isArray(crear.imagenesPrincipales) ? crear.imagenesPrincipales : []),
    ...(Array.isArray(crear.imagenesSecundarias) ? crear.imagenesSecundarias : []),
  ];
  for (const img of candidatas) {
    const url = urlImagenAbsoluta(typeof img === 'string' ? img : img?.urls);
    if (url) return url;
  }
  return porDefecto;
}
