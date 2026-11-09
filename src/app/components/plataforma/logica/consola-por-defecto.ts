import { MePlataforma, SobrePlataforma } from '../plataforma.tipos';

/**
 * D-700 15.2 — ¿La Consola vieja (`/empresas`) debe mandar a la nueva (`/plataforma`)?
 * Solo si el servidor dice que la persona tiene acceso (`esPlataforma`) y `consolaNuevaPorDefecto` es exactamente
 * `true` (llave ausente o cualquier otro valor equivale a apagada). Salida de emergencia: `?vieja=1` deja ver la
 * Consola vieja (el «Constructor web» solo vive allí hasta un cambio aparte). Es ayuda de navegación: la
 * autorización real es el servidor.
 */
export function debeIrAConsolaNueva(
  respuesta: SobrePlataforma<MePlataforma> | null | undefined,
  parametros: { get(nombre: string): string | null } | null | undefined,
): boolean {
  try {
    if (parametros && parametros.get('vieja') === '1') return false;
    const d = respuesta && respuesta.datos;
    if (!d || d.esPlataforma !== true) return false;
    return !!d.banderas && d.banderas['consolaNuevaPorDefecto'] === true;
  } catch {
    return false;
  }
}
