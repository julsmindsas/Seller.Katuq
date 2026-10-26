// D-546 (F3, D10): favoritos que sobreviven a un cambio de nombre.
//
// Antes se guardaban con título y ruta (los de grupo, solo con el título): al renombrar o mover una entrada,
// la estrella dejaba de marcarse y el favorito de grupo desaparecía. Ahora se guarda lo estable: la ruta de
// una pantalla o el `id` de un grupo. El título, el ícono y el grupo salen siempre del menú actual.
// Funciones puras: se prueban con `node --test` (tests/navigation/menu-favoritos.test.js).
import { FilaMenu, SeccionVista, rutaNormalizada } from './menu-vista';

export type FavoritoGuardado = { kind: 'screen'; path: string } | { kind: 'group'; id: string };

export const CLAVE_FAVORITOS = 'sidebarFavoritesV2';
export const CLAVE_FAVORITOS_VIEJOS = 'sidebarFavoriteItems';
export const MAX_FAVORITOS = 5;

/** Un favorito ya resuelto contra el menú actual, listo para dibujar. */
export interface FavoritoVista {
  clave: string;
  guardado: FavoritoGuardado;
  titulo: string;
  icono?: string;
  /** El grupo (o la sección) que se muestra debajo del nombre. */
  grupo: string;
  /** Con ruta: se abre la pantalla. Sin ruta: es un grupo, y se abre en el menú. */
  ruta?: string;
  /** Un favorito de grupo muestra sus pantallas debajo (D-517). */
  pantallas: Array<{ titulo: string; ruta: string }>;
  /** Para abrirlo en el menú: la fila del grupo, o la sección si el grupo es `inline`. */
  filaGrupo?: FilaMenu;
  seccionId?: string;
  /** Lo que marca su estrella (siempre rellena en la lista). Es un objeto estable para la plantilla. */
  estrella: { fav: FavoritoGuardado };
}

/** El título que tenían los grupos antes de F3 -> su `id` estable. «Logística» es el de Operaciones, el primero del menú. */
export const TITULOS_VIEJOS_A_ID: Record<string, string> = {
  'Gestión General': 'gestion-general',
  'Clientes': 'clientes',
  'Ventas': 'ventas',
  'Cotizaciones': 'cotizaciones',
  'Mi página web': 'sitio-web',
  'Dropshipping': 'dropshipping',
  'CRM': 'crm',
  'NPS': 'nps',
  'Finanzas': 'finanzas',
  'Pedidos': 'pedidos',
  'Producción': 'produccion',
  'Agenda': 'agenda',
  'Logística': 'logistica',
  'En vivo': 'en-vivo',
  'Productos': 'productos',
  'Inventarios': 'bodegas',
  'Compras': 'compras',
  'Lista de precios': 'precios',
  'Picking y packing': 'alistamiento',
  'Mensajes': 'mensajes',
  'Indicadores': 'indicadores',
  'Agent Builder': 'agentes-ia',
  'Seguridad': 'seguridad',
  'Empresa': 'empresa',
  'Módulos Variables': 'modulos-variables',
  'Inventarios y productos': 'config-inventario',
  'Producto': 'config-productos',
  'Pagos': 'pagos',
  'Integraciones': 'integraciones',
  'Notificaciones': 'notificaciones',
};

export function mismoFavorito(a: FavoritoGuardado, b: FavoritoGuardado): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'screen' ? rutaNormalizada(a.path) === rutaNormalizada((b as { path: string }).path) : a.id === (b as { id: string }).id;
}

export function esFavorito(lista: FavoritoGuardado[], favorito: FavoritoGuardado): boolean {
  return lista.some(item => mismoFavorito(item, favorito));
}

export function quitarFavorito(lista: FavoritoGuardado[], favorito: FavoritoGuardado): FavoritoGuardado[] {
  return lista.filter(item => !mismoFavorito(item, favorito));
}

/**
 * Agrega al principio. Con el límite de 5 (D-517) sale el último, como siempre.
 * Una pantalla repetida no se duplica: sube al principio.
 */
export function agregarFavorito(lista: FavoritoGuardado[], favorito: FavoritoGuardado): FavoritoGuardado[] {
  return [favorito, ...quitarFavorito(lista, favorito)].slice(0, MAX_FAVORITOS);
}

/**
 * La conversión de los favoritos de antes (`sidebarFavoriteItems`: título, ruta e ícono) a los de ahora.
 * - pantalla: conserva su ruta;
 * - grupo: su título viejo se traduce al `id`; si no se reconoce, se descarta.
 * No mira el menú: filtrar por el rol es otro paso (`filtrarPorRol`). Respeta el límite de 5 y no repite.
 */
export function convertirFavoritosViejos(viejos: unknown): FavoritoGuardado[] {
  const lista: FavoritoGuardado[] = [];
  const entradas = Array.isArray(viejos) ? viejos : [];
  for (const viejo of entradas) {
    const titulo = String((viejo as { title?: unknown })?.title || '');
    const ruta = String((viejo as { path?: unknown })?.path || '');
    let favorito: FavoritoGuardado | null = null;
    if (ruta) {
      favorito = { kind: 'screen', path: ruta };
    } else if (TITULOS_VIEJOS_A_ID[titulo]) {
      favorito = { kind: 'group', id: TITULOS_VIEJOS_A_ID[titulo] };
    }
    if (favorito && !esFavorito(lista, favorito)) lista.push(favorito);
  }
  return lista.slice(0, MAX_FAVORITOS);
}

/** Valida lo leído de `sidebarFavoritesV2`: ignora cualquier cosa que no tenga la forma esperada. */
export function leerFavoritosGuardados(crudo: unknown): FavoritoGuardado[] {
  const lista: FavoritoGuardado[] = [];
  for (const item of Array.isArray(crudo) ? crudo : []) {
    const favorito: FavoritoGuardado | null =
      item?.kind === 'screen' && typeof item.path === 'string' && item.path
        ? { kind: 'screen', path: item.path }
        : item?.kind === 'group' && typeof item.id === 'string' && item.id
          ? { kind: 'group', id: item.id }
          : null;
    if (favorito && !esFavorito(lista, favorito)) lista.push(favorito);
  }
  return lista.slice(0, MAX_FAVORITOS);
}

function enlacesDe(filas: FilaMenu[]): Array<{ titulo: string; ruta: string }> {
  return filas.filter(fila => fila.tipo === 'enlace' && fila.ruta).map(fila => ({ titulo: fila.titulo, ruta: fila.ruta as string }));
}

/** Resuelve un favorito contra el menú ya filtrado por rol. Devuelve null si el rol ya no lo ve. */
export function resolverFavorito(favorito: FavoritoGuardado, secciones: SeccionVista[]): FavoritoVista | null {
  const resuelto = resolverSinEstrella(favorito, secciones);
  return resuelto ? { ...resuelto, estrella: { fav: favorito } } : null;
}

function resolverSinEstrella(favorito: FavoritoGuardado, secciones: SeccionVista[]): Omit<FavoritoVista, 'estrella'> | null {
  if (favorito.kind === 'screen') {
    const ruta = rutaNormalizada(favorito.path);
    for (const seccion of secciones) {
      for (const fila of seccion.filas) {
        // Un enlace directo (propio, de un grupo de un hijo o de un grupo `inline`) o un hijo de un grupo.
        if (fila.tipo === 'enlace' && rutaNormalizada(fila.ruta) === ruta) {
          return { clave: `p:${ruta}`, guardado: favorito, titulo: fila.titulo, icono: fila.icono || seccion.icono, grupo: seccion.titulo || '', ruta: fila.ruta, pantallas: [] };
        }
        const hijo = fila.hijos.find(h => h.tipo === 'enlace' && rutaNormalizada(h.ruta) === ruta);
        if (hijo) {
          return { clave: `p:${ruta}`, guardado: favorito, titulo: hijo.titulo, icono: fila.icono || seccion.icono, grupo: fila.titulo, ruta: hijo.ruta, pantallas: [] };
        }
      }
    }
    return null;
  }

  for (const seccion of secciones) {
    // Un grupo `inline` (Finanzas, Mensajes) se muestra con el nombre de su sección y sus pantallas debajo.
    if (seccion.grupoEnLinea?.id === favorito.id) {
      return { clave: `g:${favorito.id}`, guardado: favorito, titulo: seccion.titulo || '', icono: seccion.icono, grupo: '', pantallas: enlacesDe(seccion.filas), seccionId: seccion.id };
    }
    for (const fila of seccion.filas) {
      if (fila.id !== favorito.id) continue;
      if (fila.tipo === 'grupo') {
        return { clave: `g:${favorito.id}`, guardado: favorito, titulo: fila.titulo, icono: fila.icono || seccion.icono, grupo: seccion.titulo || '', pantallas: enlacesDe(fila.hijos), filaGrupo: fila, seccionId: seccion.id };
      }
      // Un grupo que hoy se dibuja como enlace directo sale como ese enlace.
      if (fila.tipo === 'enlace' && fila.ruta) {
        return { clave: `g:${favorito.id}`, guardado: favorito, titulo: fila.titulo, icono: fila.icono || seccion.icono, grupo: seccion.titulo || '', ruta: fila.ruta, pantallas: [] };
      }
    }
  }
  return null;
}

/**
 * Lo que identifica la pantalla a la que lleva un favorito ya resuelto. Un grupo guardado (`g:precios`) y su única
 * pantalla guardada (`p:lista-precios/lista-precios`) tienen claves distintas pero llevan al mismo sitio: se
 * deduplican por la ruta final cuando la hay.
 */
function destinoDe(resuelto: { clave: string; ruta?: string }): string {
  return resuelto.ruta ? `r:${rutaNormalizada(resuelto.ruta)}` : resuelto.clave;
}

/** Los favoritos que el rol sigue viendo, en su orden y con el nombre actual. */
export function resolverFavoritos(lista: FavoritoGuardado[], secciones: SeccionVista[]): FavoritoVista[] {
  const vistos = new Set<string>();
  const resueltos: FavoritoVista[] = [];
  for (const favorito of lista) {
    const resuelto = resolverFavorito(favorito, secciones);
    if (!resuelto) continue;
    const destino = destinoDe(resuelto);
    if (vistos.has(resuelto.clave) || vistos.has(destino)) continue;
    vistos.add(resuelto.clave);
    vistos.add(destino);
    resueltos.push(resuelto);
  }
  return resueltos;
}

/**
 * Descarta lo que el rol ya no ve, como siempre. Si el menú aún no cargó (sin secciones) no se descarta nada:
 * un favorito válido no debe perderse porque el menú llegó un instante después.
 */
export function filtrarPorRol(lista: FavoritoGuardado[], secciones: SeccionVista[]): FavoritoGuardado[] {
  if (secciones.length === 0) return lista;
  // Además de lo que el rol ya no ve, se descarta el segundo favorito que lleva a la misma pantalla.
  const destinos = new Set<string>();
  return lista.filter(favorito => {
    const resuelto = resolverFavorito(favorito, secciones);
    if (!resuelto) return false;
    const destino = destinoDe(resuelto);
    if (destinos.has(destino)) return false;
    destinos.add(destino);
    return true;
  }).slice(0, MAX_FAVORITOS);
}

export interface AlmacenFavoritos {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

function leerJson(almacen: AlmacenFavoritos, clave: string): unknown {
  try {
    const crudo = almacen.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

/**
 * Lee los favoritos al cargar el menú. Si todavía no existe `sidebarFavoritesV2`, convierte los de antes, una
 * sola vez por navegador, y los guarda. No borra ni toca `sidebarFavoriteItems`: si se revierte F3, la versión
 * vieja los encuentra. Sin menú cargado (sin secciones) no convierte: espera a que haya con qué comparar.
 */
export function cargarFavoritos(almacen: AlmacenFavoritos, secciones: SeccionVista[]): { lista: FavoritoGuardado[]; convertido: boolean; pendiente: boolean } {
  const nuevos = leerJson(almacen, CLAVE_FAVORITOS);
  if (Array.isArray(nuevos)) {
    return { lista: filtrarPorRol(leerFavoritosGuardados(nuevos), secciones), convertido: false, pendiente: false };
  }
  const viejos = leerJson(almacen, CLAVE_FAVORITOS_VIEJOS);
  if (secciones.length === 0) {
    return { lista: convertirFavoritosViejos(viejos), convertido: false, pendiente: true };
  }
  const lista = filtrarPorRol(convertirFavoritosViejos(viejos), secciones);
  guardarFavoritos(almacen, lista);
  return { lista, convertido: true, pendiente: false };
}

export function guardarFavoritos(almacen: AlmacenFavoritos, lista: FavoritoGuardado[]): void {
  try {
    almacen.setItem(CLAVE_FAVORITOS, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: los favoritos viven mientras la pestaña esté abierta.
  }
}
