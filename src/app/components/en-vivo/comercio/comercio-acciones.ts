import { AccionPantalla } from '../compartido/en-vivo-interaccion.service';
import { AccionAtencion } from './utilidades/atencion';

/** Lo único que se necesita de `EnVivoInteraccionService` para avisar qué abrió la persona. */
export interface EmisorDeAcciones {
  emitir(accion: AccionPantalla): void;
}

/**
 * Tocar un punto de atención o un mensajero avisa por `EnVivoInteraccionService` (`abrir-pedido` o
 * `abrir-mensajero`); la ficha la abre quien escuche. Aquí no se abre nada ni se escribe nada.
 * Sin acción (la racha, por ejemplo) no emite.
 */
export function emitirAccionDeAtencion(
  emisor: EmisorDeAcciones,
  accion: AccionAtencion | null,
  empresa: string | null
): void {
  if (!accion) return;
  if (accion.tipo === 'pedido') {
    emisor.emitir({ tipo: 'abrir-pedido', pedidoId: accion.pedidoId, empresa });
  } else {
    emisor.emitir({ tipo: 'abrir-mensajero', nombre: accion.nombre, pedidoIds: accion.pedidoIds.slice() });
  }
}
