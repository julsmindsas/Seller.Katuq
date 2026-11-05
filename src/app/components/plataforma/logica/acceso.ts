import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MePlataforma, SobrePlataforma } from '../plataforma.tipos';

/**
 * D-700 13.3 — Decide si se abre la pantalla. Es solo ayuda de navegación: la autorización real es el servidor.
 * Sin la pre-comprobación local no se pregunta; un 403 o cualquier error cierra el paso (redirige a `/`).
 */
export function decidirAcceso(
  precomprobacion: boolean,
  confirmar: () => Observable<SobrePlataforma<MePlataforma>>,
): Observable<boolean> {
  if (!precomprobacion) return of(false);
  return confirmar().pipe(
    map((r) => !!(r && r.datos && r.datos.esPlataforma === true)),
    catchError(() => of(false)),
  );
}
