import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { EstadoEnVivo, PreferenciasEnVivo } from '../servicios/en-vivo.modelos';
import { armarFlota } from '../utilidades/flota';
import { armarAtencion, contarUrgentes, ItemAtencion } from './utilidades/atencion';

/**
 * Lo que los componentes del centro del comercio leen de `EnVivoEstadoService`, como funciones
 * sobre observables (sin Angular) para poder probarlas con node suelto. Son solo lectura.
 */

/** "Ocultar clientes y montos" (preferencia del navegador). */
export function ocultarDe$(preferencias$: Observable<PreferenciasEnVivo>): Observable<boolean> {
  return preferencias$.pipe(
    map((p) => p.ocultar === true),
    distinctUntilChanged()
  );
}

/** "Atención ahora" lista para pintar. */
export interface VistaAtencion {
  /** Ya llegó el radar del servidor; antes de eso no se puede decir "Todo al día". */
  calculada: boolean;
  items: ItemAtencion[];
  /** Puntos graves o por revisar (los que cuentan en "N por atender"). */
  urgentes: number;
  empresa: string | null;
  /** Katuq mirando a un comercio: los textos hablan en tercera persona. */
  soloLectura: boolean;
  /** D-349: el vendedor ve solo lo suyo. */
  soloPropias: boolean;
}

type EntradaAtencion = Pick<
  EstadoEnVivo,
  'radar' | 'flota' | 'pedidos' | 'actualizadoEn' | 'empresa' | 'soloLectura' | 'soloPropias'
>;

function mismaEntrada(a: EntradaAtencion, b: EntradaAtencion): boolean {
  return (
    a.radar === b.radar &&
    a.flota === b.flota &&
    a.pedidos === b.pedidos &&
    a.actualizadoEn === b.actualizadoEn &&
    a.empresa === b.empresa &&
    a.soloLectura === b.soloLectura &&
    a.soloPropias === b.soloPropias
  );
}

export function vistaAtencionDe(estado: EntradaAtencion): VistaAtencion {
  // La flota con lo que lleva cada uno sirve para abrir al mensajero con sus pedidos.
  const flota = armarFlota(estado.flota, estado.pedidos, estado.actualizadoEn);
  const items = armarAtencion(estado.radar, flota);
  return {
    calculada: estado.radar !== null,
    items,
    urgentes: contarUrgentes(items),
    empresa: estado.empresa,
    soloLectura: estado.soloLectura,
    soloPropias: estado.soloPropias,
  };
}

/**
 * La "atención ahora" del comercio, CONGELADA mientras se repite el día (`repitiendo$` en true): la
 * repetición no cambia el radar, así que la lista queda como estaba y vuelve a moverse al terminar.
 * Lo primero que llega pasa siempre (para que la pantalla no quede vacía si se abre repitiendo).
 */
export function atencionCongelada$(
  estado$: Observable<EstadoEnVivo>,
  repitiendo$: Observable<boolean>
): Observable<VistaAtencion> {
  return combineLatest([
    estado$.pipe(
      map(
        (e): EntradaAtencion => ({
          radar: e.radar,
          flota: e.flota,
          pedidos: e.pedidos,
          actualizadoEn: e.actualizadoEn,
          empresa: e.empresa,
          soloLectura: e.soloLectura,
          soloPropias: e.soloPropias,
        })
      ),
      distinctUntilChanged(mismaEntrada)
    ),
    repitiendo$.pipe(distinctUntilChanged()),
  ]).pipe(
    filter(([, repitiendo], emision) => emision === 0 || !repitiendo),
    map(([entrada]) => vistaAtencionDe(entrada))
  );
}
