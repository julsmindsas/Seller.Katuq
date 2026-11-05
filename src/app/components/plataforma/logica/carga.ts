import { Observable, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { EstadoCarga } from '../plataforma.tipos';

/**
 * D-700 13.7a — Estado de carga propio de cada sección: `cargando`, `error` (con «Reintentar») y datos.
 * Una sección que falla no toca a las demás.
 */
export function estadoInicial<T>(cargando = true): EstadoCarga<T> {
  return { cargando, error: null, codigo: null, datos: null };
}

/** Mensaje para la persona: nunca el cuerpo crudo del servidor ni detalles internos. */
export function mensajeError(err: unknown): { texto: string; codigo: string | null } {
  const e = err as { status?: number; error?: { code?: string } } | null;
  const codigo = e && e.error && typeof e.error.code === 'string' ? e.error.code : null;
  const estado = e && typeof e.status === 'number' ? e.status : 0;
  if (estado === 403) return { texto: 'No tienes acceso a esta información.', codigo };
  if (estado === 503 && codigo === 'FICHA_NO_HABILITADA') return { texto: 'La ficha de comercio aún no está habilitada.', codigo };
  if (estado === 503 && codigo === 'AUDITORIA_NO_REGISTRADA') return { texto: 'No se pudo registrar la apertura de la ficha, así que no se muestra.', codigo };
  if (estado === 422) return { texto: 'La consulta no es válida.', codigo };
  return { texto: 'No se pudo cargar esta sección.', codigo };
}

export function conEstado<T>(fuente: Observable<T>): Observable<EstadoCarga<T>> {
  return fuente.pipe(
    map((datos): EstadoCarga<T> => ({ cargando: false, error: null, codigo: null, datos })),
    catchError((err) => {
      const m = mensajeError(err);
      return of<EstadoCarga<T>>({ cargando: false, error: m.texto, codigo: m.codigo, datos: null });
    }),
    startWith(estadoInicial<T>()),
  );
}
