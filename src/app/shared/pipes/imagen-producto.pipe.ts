import { Pipe, PipeTransform } from '@angular/core';
import {
  IMAGEN_PRODUCTO_POR_DEFECTO,
  urlImagenAbsoluta,
} from '../utils/imagen-producto';

/**
 * Resuelve la ruta de una imagen de producto a URL absoluta.
 *
 * Buena parte del catálogo tiene la ruta **relativa** que devuelve Osmosis
 * (`/osmosis/products/...`). Puesta tal cual en un `<img>`, el navegador la
 * resuelve contra nuestro propio dominio y el rewrite de Firebase responde el
 * HTML de la aplicación en lugar de la foto: la imagen falla en silencio y
 * queda el hueco. Ver `shared/utils/imagen-producto`.
 *
 * Es `standalone` a propósito: las pantallas afectadas viven en módulos
 * distintos (lista de precios, inventarios, ventas, encabezado) y un pipe
 * normal solo puede declararse en uno.
 *
 * Uso:
 *   <img [src]="producto.crearProducto?.imagenesPrincipales?.[0]?.urls | imagenProducto">
 *   <img [src]="ruta | imagenProducto: 'assets/images/placeholders/product-not-found.svg'">
 *
 * Con `porDefecto` en `null` devuelve null cuando no hay imagen, para que el
 * template decida qué mostrar.
 */
@Pipe({ name: 'imagenProducto', standalone: true })
export class ImagenProductoPipe implements PipeTransform {
  transform(
    ruta: string | null | undefined,
    porDefecto: string | null = IMAGEN_PRODUCTO_POR_DEFECTO,
  ): string | null {
    return urlImagenAbsoluta(ruta) ?? porDefecto;
  }
}
