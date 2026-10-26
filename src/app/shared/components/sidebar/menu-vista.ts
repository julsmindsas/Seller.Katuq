// D-546 (menú lateral ordenado): la vista del menú se arma aquí, en funciones puras.
//
// `NavService` entrega el menú ya filtrado por rol y banderas (misma forma de siempre);
// este módulo lo convierte en secciones con filas listas para dibujar. No toca Angular,
// el DOM ni el almacenamiento, así que se prueba con `node --test` (tests/navigation).
import type { Menu } from '../../services/nav.service';

export type TonoInsignia = 'nuevo' | 'pronto';

export interface InsigniaVista {
  /** Lo que se ve en el menú. «Próximamente» se dice «PRONTO» para que mida lo mismo que «NUEVO». */
  texto: string;
  tono: TonoInsignia;
}

export type TipoFila = 'enlace' | 'grupo' | 'info' | 'externo';

export interface FilaMenu {
  /** Estable entre renders: sirve de `trackBy`. */
  clave: string;
  /** F3: `id` estable del grupo (o de la sección) de donde sale la fila; los favoritos de grupo se guardan con él. */
  id?: string;
  /** F3: enlace directo que sale de un grupo con un solo hijo (Producción, Precios...): lleva el nombre y el ícono del grupo. */
  deGrupo?: boolean;
  /** F3: nombres de antes (`previousTitle`) de esta entrada y, si viene de un grupo de un hijo, también del hijo. */
  anteriores: string[];
  /** 2 = grupo o enlace directo; 3 = hijo de un grupo. */
  nivel: 2 | 3;
  tipo: TipoFila;
  titulo: string;
  ruta?: string;
  /** F2: nombre del ícono Tabler (`menuIcon`) de un grupo o enlace directo. El tercer nivel no lleva ícono. */
  icono?: string;
  insignia: InsigniaVista | null;
  /** Solo grupos: algún hijo tiene NUEVO vigente (el punto en la esquina del ícono). */
  punto: boolean;
  /** El nodo del menú de donde sale la fila; sobre él se abren, cierran y marcan favoritos. */
  fuente: Menu;
  hijos: FilaMenu[];
}

export interface SeccionVista {
  /** F3: `id` estable de la sección. */
  id?: string;
  /** F3: la sección está hecha de un grupo `inline` (Finanzas, Comunicaciones): su cabecera lleva la estrella de ese grupo. */
  grupoEnLinea?: { id: string; titulo: string };
  titulo: string | null;
  /** F2: ícono Tabler de la sección (`menuIcon` de su cabecera). */
  icono?: string;
  isHeaderSection: boolean;
  /** Los nodos de la sección tal como los entrega `NavService` (el acordeón trabaja sobre ellos). */
  items: Menu[];
  filas: FilaMenu[];
}

/** Ticket 1177: la insignia se muestra mientras no venza `badgeUntil`. */
export function insigniaVigente(item: Menu | undefined | null, ahora: Date = new Date()): boolean {
  if (!item || !item.badgeValue) return false;
  if (!item.badgeUntil) return true;
  const limite = new Date(item.badgeUntil + 'T23:59:59');
  return isNaN(limite.getTime()) ? true : ahora <= limite;
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** La insignia que se pinta, o null si no hay o ya venció. */
export function etiquetaInsignia(item: Menu | undefined | null, ahora: Date = new Date()): InsigniaVista | null {
  if (!insigniaVigente(item, ahora)) return null;
  const valor = String(item!.badgeValue).trim();
  if (sinTildes(valor) === 'proximamente') return { texto: 'PRONTO', tono: 'pronto' };
  return { texto: valor.toUpperCase(), tono: 'nuevo' };
}

/** Un hijo cuenta como novedad solo si tiene NUEVO vigente: «Próximamente» no enciende el punto. */
export function esNovedad(hijo: Menu | undefined | null, ahora: Date = new Date()): boolean {
  return !!hijo && hijo.type !== 'info' && etiquetaInsignia(hijo, ahora)?.tono === 'nuevo';
}

export function hasNewChild(item: Menu | undefined | null, ahora: Date = new Date()): boolean {
  return !!item?.children?.some(hijo => esNovedad(hijo, ahora));
}

function anterioresDe(...items: Array<Menu | undefined>): string[] {
  return items.map(item => item?.previousTitle || '').filter(Boolean);
}

function tipoDe(item: Menu): TipoFila {
  return item.type === 'info' ? 'info' : item.type === 'extLink' ? 'externo' : 'enlace';
}

function filaDeHijo(hijo: Menu, clave: string, ahora: Date): FilaMenu {
  const tipo = tipoDe(hijo);
  return {
    clave,
    nivel: 3,
    tipo,
    titulo: hijo.title || '',
    ruta: tipo === 'info' ? undefined : hijo.path,
    anteriores: anterioresDe(hijo),
    insignia: etiquetaInsignia(hijo, ahora),
    punto: false,
    fuente: hijo,
    hijos: [],
  };
}

/** Un hijo de un grupo `inline`: se dibuja como enlace de la sección, con su propio ícono. */
function filaEnLinea(hijo: Menu, clave: string, ahora: Date): FilaMenu {
  const tipo = tipoDe(hijo);
  return {
    clave,
    nivel: 2,
    tipo,
    titulo: hijo.title || '',
    ruta: tipo === 'info' ? undefined : hijo.path,
    icono: hijo.menuIcon,
    anteriores: anterioresDe(hijo),
    insignia: etiquetaInsignia(hijo, ahora),
    punto: false,
    fuente: hijo,
    hijos: [],
  };
}

/**
 * Las filas de un elemento de primer nivel. Reglas de dibujo (spec `sidebar-structure`):
 * - un grupo `inline` no se dibuja: sus hijos son enlaces de la sección;
 * - un grupo sin hijos visibles no se dibuja;
 * - un grupo con un solo hijo (por definición o porque el rol solo ve uno) se dibuja como enlace directo
 *   con el nombre y el ícono del grupo, que abre ese hijo.
 */
function filasDeItem(item: Menu, clave: string, ahora: Date): FilaMenu[] {
  if (!item.children) {
    const tipo = tipoDe(item);
    return [{
      clave,
      id: item.id,
      nivel: 2,
      tipo,
      titulo: item.title || '',
      ruta: tipo === 'info' ? undefined : item.path,
      icono: item.menuIcon,
      anteriores: anterioresDe(item),
      insignia: etiquetaInsignia(item, ahora),
      punto: false,
      fuente: item,
      hijos: [],
    }];
  }
  const hijos = item.children;
  if (item.display === 'inline') {
    return hijos.map((hijo, i) => filaEnLinea(hijo, `${clave}.${i}`, ahora));
  }
  if (hijos.length === 0) return [];
  const unico = hijos.length === 1 && hijos[0].type !== 'info' ? hijos[0] : null;
  if (unico) {
    return [{
      clave,
      id: item.id,
      deGrupo: true,
      nivel: 2,
      tipo: tipoDe(unico),
      titulo: item.title || '',
      ruta: unico.path,
      icono: item.menuIcon,
      anteriores: anterioresDe(item, unico),
      insignia: etiquetaInsignia(unico, ahora),
      punto: false,
      fuente: item,
      hijos: [],
    }];
  }
  return [{
    clave,
    id: item.id,
    nivel: 2,
    tipo: 'grupo',
    titulo: item.title || '',
    icono: item.menuIcon,
    anteriores: anterioresDe(item),
    insignia: null,
    punto: hasNewChild(item, ahora),
    fuente: item,
    hijos: hijos.map((hijo, i) => filaDeHijo(hijo, `${clave}.${i}`, ahora)),
  }];
}

export function construirFilas(items: Menu[], prefijo = '', ahora: Date = new Date()): FilaMenu[] {
  return items.flatMap((item, i) => filasDeItem(item, `${prefijo}${i}`, ahora));
}

/**
 * Parte el menú plano de `NavService` en secciones (cada `headTitle1` abre una) y arma las filas.
 * `ocultar` esconde entradas del menú, con sus hijos (Empresa, Usuarios y Roles viven en la
 * Configuración de empresa, no en el menú). Quita los nulos y los hijos ocultos de cada grupo.
 */
export function construirVistaMenu(
  menu: Menu[],
  ocultar: (item: Menu) => boolean = () => false,
  ahora: Date = new Date(),
): SeccionVista[] {
  const secciones: SeccionVista[] = [];
  let titulo: string | null = null;
  let icono: string | undefined;
  let idSeccion: string | undefined;
  let esCabecera = false;
  let items: Menu[] = [];

  const cerrar = () => {
    if (items.length === 0) return;
    const grupos = items.filter(item => item.children);
    const enLinea = items.length === 1 && grupos.length === 1 && grupos[0].display === 'inline' ? grupos[0] : null;
    secciones.push({
      id: idSeccion,
      titulo,
      icono,
      isHeaderSection: esCabecera,
      grupoEnLinea: enLinea ? { id: enLinea.id || '', titulo: enLinea.title || '' } : undefined,
      items: [...items],
      filas: [],
    });
    items = [];
  };

  for (const item of menu || []) {
    if (!item || ocultar(item)) continue;
    if (item.headTitle1) {
      cerrar();
      titulo = item.headTitle1;
      icono = item.menuIcon;
      idSeccion = item.id;
      esCabecera = true;
    } else if (!item.headTitle2) {
      if (titulo === null && items.length === 0) esCabecera = false;
      if (item.children && item.children.length) {
        item.children = item.children.filter(hijo => !ocultar(hijo));
        item.children.forEach(hijo => {
          if (hijo.children && hijo.children.length) hijo.children = hijo.children.filter(nieto => !ocultar(nieto));
        });
      }
      items.push(item);
    }
  }
  cerrar();

  secciones.forEach((seccion, i) => {
    seccion.filas = construirFilas(seccion.items, `${i}.`, ahora);
  });
  // Una sección sin filas (por ejemplo, solo tenía un grupo sin hijos visibles) no se dibuja.
  return secciones.filter(seccion => seccion.filas.length > 0);
}

/** Ruta sin barra inicial y en minúscula, para comparar rutas del menú con las de los favoritos. */
export function rutaNormalizada(ruta: string | undefined | null): string {
  return String(ruta || '').replace(/^\/+/, '').toLowerCase();
}

export interface ResultadoBusqueda {
  clave: string;
  titulo: string;
  /** El grupo al que pertenece («Bodegas» para «Existencias»); vacío en un enlace directo. */
  grupo: string;
  ruta: string;
  icono?: string;
}

/** Sin mayúsculas ni tildes, para comparar lo que el usuario escribe con los nombres del menú. */
export function normalizarTexto(texto: string | undefined | null): string {
  return sinTildes(String(texto || '').trim());
}

/**
 * D11: el buscador del menú. Compara, sin mayúsculas ni tildes, con el nombre, la ruta y, mientras no pase
 * `hasta` (YYYY-MM-DD), también con el nombre anterior de cada entrada. Solo devuelve pantallas (con ruta).
 */
export function buscarEntradas(
  secciones: SeccionVista[],
  termino: string,
  ahora: Date = new Date(),
  hasta: string = '',
  limite = 8,
): ResultadoBusqueda[] {
  const buscado = normalizarTexto(termino);
  if (!buscado) return [];
  const limiteAnteriores = hasta ? new Date(hasta + 'T23:59:59') : null;
  const conAnteriores = !!limiteAnteriores && !isNaN(limiteAnteriores.getTime()) && ahora <= limiteAnteriores;
  const resultados: ResultadoBusqueda[] = [];

  const coincide = (fila: FilaMenu, extras: string[] = []): boolean => {
    const candidatos = [fila.titulo, fila.ruta || '', ...(conAnteriores ? [...fila.anteriores, ...extras] : [])];
    return candidatos.some(c => normalizarTexto(c).includes(buscado));
  };

  const probar = (fila: FilaMenu, grupo: string, iconoGrupo: string | undefined, porGrupo = false) => {
    if (resultados.length >= limite || fila.tipo !== 'enlace' || !fila.ruta) return;
    if (porGrupo || coincide(fila)) {
      resultados.push({ clave: fila.clave, titulo: fila.titulo, grupo, ruta: fila.ruta, icono: fila.icono || iconoGrupo });
    }
  };

  for (const seccion of secciones) {
    for (const fila of seccion.filas) {
      if (fila.tipo === 'grupo') {
        // El nombre anterior de un grupo («Mi página web») lleva a todas sus pantallas.
        const porGrupo = conAnteriores && fila.anteriores.some(a => normalizarTexto(a).includes(buscado));
        for (const hijo of fila.hijos) probar(hijo, fila.titulo, fila.icono || seccion.icono, porGrupo);
      } else {
        probar(fila, '', seccion.icono);
      }
    }
  }
  return resultados;
}
