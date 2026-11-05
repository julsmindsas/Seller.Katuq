/**
 * D-700 13.4a — Aviso «Estas cifras usan la definición …»: sale la primera vez que se abre cada versión de regla
 * y no vuelve tras «ya lo vi». El almacenamiento del navegador puede fallar o no existir (ventana privada, sitio
 * bloqueado): en ese caso el aviso se muestra igual y nunca se lanza un error.
 */
export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

const PREFIJO = 'plataforma.avisoVisto.';

export function almacenLocal(): Almacen | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function avisoPendiente(version: string | null | undefined, almacen: Almacen | null): boolean {
  if (!version) return false;
  try {
    return !almacen || almacen.getItem(PREFIJO + version) !== '1';
  } catch {
    return true;
  }
}

/** Devuelve `true` si quedó guardado; si no se pudo, el componente igual oculta el aviso mientras dure la sesión. */
export function marcarAvisoVisto(version: string | null | undefined, almacen: Almacen | null): boolean {
  if (!version) return false;
  try {
    if (!almacen) return false;
    almacen.setItem(PREFIJO + version, '1');
    return true;
  } catch {
    return false;
  }
}
