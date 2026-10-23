// D-546 (F2, D8): un solo botón alterna el menú entre abierto y compacto, y Katuq recuerda la
// elección de cada usuario. Funciones puras sobre un almacén con `getItem`/`setItem`
// (`localStorage` en la app, un objeto en las pruebas de tests/navigation).

export type ModoMenu = 'abierto' | 'compacto';

/** Clave del navegador: `{ [hashDelCorreo]: 'compacto' | 'abierto' }`. */
export const CLAVE_MODO_MENU = 'katuqMenuModo';

export interface AlmacenMenu {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

/**
 * FNV-1a de 32 bits sobre el correo en minúsculas: el correo no queda en claro en el navegador
 * después de cerrar sesión (Artículo XI). No es seguridad: solo evita guardar el dato personal.
 */
export function hashCorreo(correo: string | undefined | null): string {
  const texto = String(correo || '').trim().toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function leerObjeto(almacen: AlmacenMenu): Record<string, ModoMenu> {
  try {
    const objeto = JSON.parse(almacen.getItem(CLAVE_MODO_MENU) || '{}');
    return objeto && typeof objeto === 'object' && !Array.isArray(objeto) ? objeto : {};
  } catch {
    return {};
  }
}

/** La preferencia guardada de este usuario, o null si nunca eligió. */
export function leerModo(almacen: AlmacenMenu, correo: string | undefined | null): ModoMenu | null {
  const modo = leerObjeto(almacen)[hashCorreo(correo)];
  return modo === 'compacto' || modo === 'abierto' ? modo : null;
}

export function guardarModo(almacen: AlmacenMenu, correo: string | undefined | null, modo: ModoMenu): void {
  try {
    const objeto = leerObjeto(almacen);
    objeto[hashCorreo(correo)] = modo;
    almacen.setItem(CLAVE_MODO_MENU, JSON.stringify(objeto));
  } catch {
    // Sin almacenamiento (ventana privada, datos bloqueados): el menú sigue funcionando.
  }
}

/** Lo que hacían las tres claves de antes: colapsado (`sidebarCollapsed`), «modo compacto» y el estado de LayoutService. */
export function modoHeredado(almacen: AlmacenMenu): ModoMenu | null {
  const leer = (clave: string) => {
    try { return almacen.getItem(clave); } catch { return null; }
  };
  if (leer('sidebarCollapsed') === 'true' || leer('sidebarCompactMode') === 'true') return 'compacto';
  try {
    const estado = JSON.parse(leer('katuq_sidebar_state') || 'null');
    if (estado && (estado.isCollapsed === true || estado.isCompactMode === true)) return 'compacto';
  } catch {
    // estado viejo ilegible: se ignora
  }
  return null;
}

/**
 * El modo con el que arranca este usuario en escritorio. Si no tiene preferencia se lee lo de antes
 * una sola vez y se guarda, sin borrar las claves viejas (así un rollback las encuentra).
 */
export function modoInicial(almacen: AlmacenMenu, correo: string | undefined | null): ModoMenu {
  const guardado = leerModo(almacen, correo);
  if (guardado) return guardado;
  const heredado = modoHeredado(almacen) || 'abierto';
  guardarModo(almacen, correo, heredado);
  return heredado;
}
