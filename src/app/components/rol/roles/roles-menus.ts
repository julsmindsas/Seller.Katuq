// D-546 (F3, D12): el catálogo de menús del editor de roles, en funciones puras (se prueban con `node --test`).
//
// Los permisos de un rol son RUTAS: el título de una entrada es solo lo que se ve. Por eso:
//  - cada entrada se muestra con su grupo («Clientes · Listado»), para que los nombres cortos repetidos
//    («Listado» de Clientes, de Cotizaciones y de Productos) no se confundan;
//  - un rol guardado con los nombres de antes se reconoce por la ruta, sin duplicarse;
//  - lo que se guarda en `menus` conserva su ruta y no lleva campos de presentación.
import type { Menu } from '../../../shared/services/nav.service';

/**
 * Campos que solo existen para dibujar el menú o el catálogo: nunca se escriben en el rol (el rol guarda rutas).
 * `etiqueta` y `previousTitle` son del selector; `menuIcon`, `id` y `display` son de la estructura del menú (D-546).
 */
export const CAMPOS_DE_PRESENTACION = ['etiqueta', 'previousTitle', 'menuIcon', 'id', 'display'] as const;

function rutaNormalizada(ruta: string | undefined): string {
  return String(ruta || '').replace(/^\/+/, '').toLowerCase();
}

/**
 * Dos entradas son la misma si tienen la misma ruta. Los encabezados de grupo no tienen ruta: se reconocen por su título.
 */
export function mismaEntrada(a: Partial<Menu>, b: Partial<Menu>): boolean {
  if (a.path && b.path) return rutaNormalizada(a.path) === rutaNormalizada(b.path);
  if (!a.path && !b.path) return !!a.title && a.title === b.title;
  return false;
}

/**
 * El catálogo plano que muestra el selector: encabezado de cada grupo, sus pantallas y los permisos fuera del menú.
 * `permisosFuera` se indexa por el `id` del grupo (no por su nombre, que cambia). No modifica el menú recibido.
 * Landings (`inheritsPermissionFrom`) no se ofrece: no es un permiso, la ve quien ve «Mis sitios».
 */
export function catalogoDeMenus(menus: Menu[], permisosFuera: { [idGrupo: string]: Menu[] } = {}): Menu[] {
  const catalogo: Menu[] = [];
  let indice = 0;
  for (const menu of menus) {
    if (menu.children) {
      catalogo.push({ ...menu, children: [], movable: false, index: indice++ } as Menu);
      for (const hijo of menu.children) {
        if (hijo.inheritsPermissionFrom) continue;
        catalogo.push({ ...hijo, etiqueta: `${menu.title} · ${hijo.title}`, movable: true, index: indice++ } as Menu);
      }
      for (const permiso of permisosFuera[menu.id || ''] || []) {
        catalogo.push({ ...permiso, etiqueta: `${menu.title} · ${permiso.title}`, movable: true, index: indice++ } as Menu);
      }
    } else if (menu.path && menu.type === 'link') {
      // Enlaces de primer nivel (Tesorería de antes, Pauta...): también son permisos asignables.
      catalogo.push({ ...menu, etiqueta: menu.title, movable: true, index: indice++ } as Menu);
    }
  }
  return catalogo;
}

/** Lo que dice el selector de una entrada: su etiqueta con grupo, o su título si viene de un rol viejo. */
export function textoDeEntrada(entrada: Partial<Menu>): string {
  return (entrada as { etiqueta?: string }).etiqueta || entrada.title || '';
}

/**
 * Un rol guardado se abre con los nombres de ahora: cada entrada con ruta se cambia por la del catálogo actual.
 * Si la ruta ya no existe en el menú (una pantalla retirada) se conserva tal como estaba guardada.
 */
export function entradasConNombresActuales(guardadas: Menu[], catalogo: Menu[]): Menu[] {
  return (guardadas || []).map(guardada => {
    if (!guardada.path) return guardada;
    return catalogo.find(actual => (actual as any).movable !== false && mismaEntrada(actual, guardada)) || guardada;
  });
}

/** El catálogo sin lo que ya está seleccionado (por ruta). */
export function disponiblesSinSeleccionadas(catalogo: Menu[], seleccionadas: Menu[]): Menu[] {
  return catalogo.filter(item => !seleccionadas.some(seleccionada => mismaEntrada(seleccionada, item)));
}

/** Lo que se guarda en `menus` del rol: las mismas rutas, sin campos de presentación. */
export function menusParaGuardar(seleccionadas: Menu[]): Menu[] {
  return (seleccionadas || []).map(entrada => {
    const limpia: any = { ...entrada };
    for (const campo of CAMPOS_DE_PRESENTACION) delete limpia[campo];
    return limpia as Menu;
  });
}
