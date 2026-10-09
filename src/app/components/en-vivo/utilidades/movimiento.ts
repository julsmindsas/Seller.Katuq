import { NgZone } from '@angular/core';

/** true si la persona pidió menos movimiento (`prefers-reduced-motion: reduce`). Nunca lanza. */
export function prefiereMenosMovimiento(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Avisa cuando cambia la preferencia de movimiento. Devuelve la función para dejar de escuchar.
 * Sin `matchMedia` no avisa nunca.
 */
export function alCambiarMovimiento(alCambiar: (menos: boolean) => void): () => void {
  try {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const oyente = (evento: MediaQueryListEvent): void => alCambiar(evento.matches);
    if (consulta.addEventListener) {
      consulta.addEventListener('change', oyente);
      return () => consulta.removeEventListener('change', oyente);
    }
  } catch {
    // Sin matchMedia: no hay nada que escuchar.
  }
  return () => undefined;
}

/**
 * `setInterval` FUERA de la zona de Angular: el temporizador no dispara la detección de cambios
 * de toda la app; quien lo usa llama `detectChanges()` solo en su componente. Devuelve la función
 * para pararlo.
 */
export function cadaFueraDeZona(zona: NgZone, ms: number, tarea: () => void): () => void {
  let id = 0;
  zona.runOutsideAngular(() => {
    id = window.setInterval(tarea, ms);
  });
  return () => window.clearInterval(id);
}
