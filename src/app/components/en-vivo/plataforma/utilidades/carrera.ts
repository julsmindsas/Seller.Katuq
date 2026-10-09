import { ComercioEnVivo } from '../../servicios/en-vivo.modelos';
import { dinero } from '../../utilidades/formato';
import {
  claseDeComercio,
  inicialesVisibles,
  mantenerOrdenEstable,
  nombreVisible,
  valorCorto,
} from './nombres';

/**
 * La carrera de los comercios que más venden hoy (spec `tablero-en-vivo-plataforma`, "Carrera,
 * cinta y ciudades"). Funciones PURAS: reciben lo que manda el servidor (`cifrasGlobal.comercios`)
 * y devuelven filas ya armadas; no suman ni calculan cifras de dinero.
 *
 * Cómo se anima (igual que el prototipo): las filas viven en un orden de DOM ESTABLE y cada una se
 * coloca con `transform: translateY(y)`, así el cambio de puesto lo anima el navegador (un nodo
 * movido en el DOM perdería la transición). Además de los 8 que se ven, quedan en el DOM unos pocos
 * "de banca" (puestos 9 a 12), escondidos debajo: cuando uno entra al top, sube desde ahí.
 */

/** Cuántos comercios se ven en la carrera. */
export const TOP_CARRERA = 8;
/** Cuántos más se dejan montados (escondidos) para que su entrada al top se anime. */
export const BANCA_CARRERA = 4;

export interface FilaCarrera {
  empresa: string;
  /** Nombre ya enmascarado si hace falta ("Comercio en Medellín"). */
  nombre: string;
  /** Nombre real: solo para avisar al abrir el tablero, nunca se pinta. */
  nombreReal: string;
  iniciales: string;
  /** `t-accent`, `t-info`... fija el color de la fila y de su barra. */
  clase: string;
  /** Puesto 1, 2, 3... */
  puesto: number;
  /** Posición vertical en filas (0 = arriba). Las de banca van justo debajo del top. */
  y: number;
  /** true = se ve (top); false = de banca, escondida. */
  dentro: boolean;
  /** "$3,4 M" o, con la privacidad, "12 pedidos". */
  valor: string;
  /** Largo de la barra respecto al líder, de 0 a 100. */
  ancho: number;
  /** Cuántos puestos subió desde la lectura anterior (0 = no subió). Marca "▲ N". */
  sube: number;
  /** Sube cada vez que la fila sube, para repetir la animación de la marca. */
  claveSube: number;
  /** Texto para lectores de pantalla. */
  etiqueta: string;
}

export interface EstadoCarrera {
  /** Filas en orden de DOM estable (NO en orden de puesto: lo da `puesto`/`y`). */
  filas: FilaCarrera[];
  /** Puesto previo (0 = líder) de TODOS los comercios con pedidos, para calcular el "▲ N". */
  puestos: ReadonlyMap<string, number>;
  /** Cuántas veces ha subido cada comercio (para repetir la animación). */
  subidas: ReadonlyMap<string, number>;
  /** Llaves de las filas en orden de DOM. */
  orden: ReadonlyArray<string>;
  /** Con qué privacidad se calculó: si cambia, el orden cambia y no hay que marcar "▲". */
  ocultar: boolean | null;
  /** Filas que se ven (alto de la carrera). */
  visibles: number;
  /** Comercios con pedidos hoy (para `aria-setsize`). */
  total: number;
}

export const CARRERA_VACIA: EstadoCarrera = {
  filas: [],
  puestos: new Map<string, number>(),
  subidas: new Map<string, number>(),
  orden: [],
  ocultar: null,
  visibles: 0,
  total: 0,
};

export interface EntradaCarrera {
  comercios: ReadonlyArray<ComercioEnVivo>;
  /** "Ocultar comercios y montos": ordena por pedidos y no muestra dinero. */
  ocultar: boolean;
  top?: number;
  banca?: number;
}

/**
 * Comercios con pedidos hoy, del que más vende al que menos. Con la privacidad encendida se ordena
 * por pedidos (no por dinero). A igual valor manda el otro, y al final el nombre: el orden es siempre el mismo.
 */
export function ordenarComercios(
  comercios: ReadonlyArray<ComercioEnVivo>,
  ocultar: boolean,
  soloConPedidos = true
): ComercioEnVivo[] {
  const clave = (c: ComercioEnVivo): number => (ocultar ? c.n : c.ventas);
  return comercios
    .filter((c) => !!c && !!c.empresa && (!soloConPedidos || c.n > 0))
    .map((c, indice) => ({ c, indice }))
    .sort(
      (a, b) =>
        clave(b.c) - clave(a.c) ||
        b.c.n - a.c.n ||
        // Con la privacidad, el orden de llegada (que viene del servidor) NO desempata por dinero.
        (ocultar ? a.indice - b.indice : String(a.c.nombre).localeCompare(String(b.c.nombre)) || a.indice - b.indice)
    )
    .map((x) => x.c);
}

function etiquetaDeFila(
  puesto: number,
  nombre: string,
  c: ComercioEnVivo,
  ocultar: boolean
): string {
  const pedidos = `${c.n} ${c.n === 1 ? 'pedido' : 'pedidos'}`;
  return `${puesto}. ${nombre}: ${pedidos}${ocultar ? '' : `, ${dinero(c.ventas)}`}. Abrir su tablero`;
}

/**
 * Siguiente estado de la carrera dado el anterior y lo nuevo que llegó. Es un `scan` puro:
 * conserva el orden de DOM, los puestos previos y el contador de subidas.
 */
export function reducirCarrera(previo: EstadoCarrera, entrada: EntradaCarrera): EstadoCarrera {
  const top = Math.max(1, entrada.top ?? TOP_CARRERA);
  const banca = Math.max(0, entrada.banca ?? BANCA_CARRERA);
  const ocultar = entrada.ocultar;

  const ordenados = ordenarComercios(entrada.comercios, ocultar);
  const lider = ordenados.length > 0 ? Math.max(1, ocultar ? ordenados[0].n : ordenados[0].ventas) : 1;

  // Si cambió la privacidad el orden cambia por otra razón: no es una "subida".
  const puestosPrevios: ReadonlyMap<string, number> = previo.ocultar === ocultar ? previo.puestos : new Map<string, number>();
  const hayPrevios = puestosPrevios.size > 0;

  const puestosNuevos = new Map<string, number>();
  ordenados.forEach((c, i) => puestosNuevos.set(c.empresa, i));

  const subidas = new Map<string, number>(previo.subidas);
  const porEmpresa = new Map<string, FilaCarrera>();
  ordenados.slice(0, top + banca).forEach((c, i) => {
    const dentro = i < top;
    const antes = puestosPrevios.get(c.empresa);
    const sube = hayPrevios && dentro && antes !== undefined && i < antes ? antes - i : 0;
    if (sube > 0) subidas.set(c.empresa, (subidas.get(c.empresa) ?? 0) + 1);
    const nombre = nombreVisible(c, ocultar);
    porEmpresa.set(c.empresa, {
      empresa: c.empresa,
      nombre,
      nombreReal: String(c.nombre ?? '').trim() || c.empresa,
      iniciales: inicialesVisibles(c, ocultar),
      clase: claseDeComercio(c.empresa),
      puesto: i + 1,
      y: dentro ? i : top,
      dentro,
      valor: valorCorto(c.ventas, c.n, ocultar),
      ancho: Math.round(((ocultar ? c.n : c.ventas) / lider) * 1000) / 10,
      sube,
      claveSube: subidas.get(c.empresa) ?? 0,
      etiqueta: etiquetaDeFila(i + 1, nombre, c, ocultar),
    });
  });

  const orden = mantenerOrdenEstable(previo.orden, Array.from(porEmpresa.keys()));
  const filas = orden.map((clave) => porEmpresa.get(clave) as FilaCarrera);

  return {
    filas,
    puestos: puestosNuevos,
    subidas,
    orden,
    ocultar,
    visibles: Math.min(top, ordenados.length),
    total: ordenados.length,
  };
}
