import { Observable } from 'rxjs';
import type { MargenesEncuadre } from '../../../shared/escena-3d/escena-base';

/**
 * Márgenes que las escenas 3D dejan libres para los paneles flotantes (D-386, 5.12/5.13). Los
 * paneles flotan sobre la escena solo desde `ANCHO_FLOTANTE` px y sin "Ampliar" (más abajo se
 * apilan debajo y la escena no necesita espacio). Cada columna mide `ANCHO_COLUMNA` px y está a
 * `SEPARACION` px del borde; se deja un respiro de `RESPIRO` px entre el panel y lo que se dibuja.
 *
 * Puro: devuelve SIEMPRE el mismo objeto para la misma combinación, así que un componente con
 * `ngOnChanges` no vuelve a encuadrar la escena en cada revisión.
 */
export const ANCHO_FLOTANTE = 1181;
export const ANCHO_COLUMNA = 320;
export const SEPARACION = 12;
export const RESPIRO = 14;

/**
 * Celular: la tarjeta de Opttia (D-422) va acoplada abajo, dentro de la escena (hasta el 45 % del
 * alto), desde `ANCHO_ACOPLADO` px hacia abajo. La escena encuadra las cajas por encima de ella.
 */
export const ANCHO_ACOPLADO = 680;
export const ABAJO_TARJETA = 250;

// La escena es un rombo: sus puntas pueden quedar bajo la parte alta de los paneles (translúcidos).
// Dejar el ancho completo del panel achicaba el dibujo a menos de la mitad en pantallas de 1440 px.
const LADO = Math.round((SEPARACION + ANCHO_COLUMNA + RESPIRO) * 0.6);

const SOLO_IZQUIERDA: Partial<MargenesEncuadre> = { l: LADO };
const SOLO_DERECHA: Partial<MargenesEncuadre> = { r: LADO };
const AMBOS: Partial<MargenesEncuadre> = { l: LADO, r: LADO };
const SOLO_ABAJO: Partial<MargenesEncuadre> = { b: ABAJO_TARJETA };

export interface PanelesFlotantes {
  /** Hay columna de paneles a la izquierda (lo próximo y flota, o el momento y la carrera). */
  izquierda: boolean;
  /** Hay columna a la derecha (la lista de eventos). */
  derecha: boolean;
}

/**
 * Los márgenes extra de la escena; null = ninguno (paneles apilados, ampliado o sin paneles).
 * Con `tarjetaAcoplada` (celular, tarjeta de Opttia abajo en la escena) se deja su alto abajo; los
 * paneles nunca flotan a ese ancho, así que no se combinan.
 */
export function margenesEscena(
  paneles: PanelesFlotantes,
  flotando: boolean,
  tarjetaAcoplada = false
): Partial<MargenesEncuadre> | null {
  if (!flotando) return tarjetaAcoplada ? SOLO_ABAJO : null;
  if (paneles.izquierda && paneles.derecha) return AMBOS;
  if (paneles.izquierda) return SOLO_IZQUIERDA;
  if (paneles.derecha) return SOLO_DERECHA;
  return null;
}

/** true mientras la ventana mide `ANCHO_FLOTANTE` px o más (los paneles flotan). Emite al cambiar. */
export function anchoFlotante$(): Observable<boolean> {
  return coincide$(`(min-width: ${ANCHO_FLOTANTE}px)`, true);
}

/** true mientras la ventana mide `ANCHO_ACOPLADO` px o menos (la tarjeta de Opttia va abajo en la escena). */
export function anchoAcoplado$(): Observable<boolean> {
  return coincide$(`(max-width: ${ANCHO_ACOPLADO}px)`, false);
}

/** Si la ventana cumple la consulta (sin `matchMedia`: `sinConsulta`). Emite al cambiar. */
function coincide$(media: string, sinConsulta: boolean): Observable<boolean> {
  return new Observable<boolean>((suscriptor) => {
    let consulta: MediaQueryList | null = null;
    try {
      consulta = window.matchMedia(media);
    } catch {
      consulta = null;
    }
    if (!consulta) {
      suscriptor.next(sinConsulta);
      return undefined;
    }
    const c = consulta;
    suscriptor.next(c.matches);
    const oyente = (e: MediaQueryListEvent): void => suscriptor.next(e.matches);
    if (c.addEventListener) {
      c.addEventListener('change', oyente);
      return () => c.removeEventListener('change', oyente);
    }
    return undefined;
  });
}
