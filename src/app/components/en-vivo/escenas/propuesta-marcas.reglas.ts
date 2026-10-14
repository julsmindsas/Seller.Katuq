import type { ColorEscena, GrupoEnEscena, PropuestaEnEscena } from '../propuestas/propuestas.modelos';
import { esColorGrupo, etiquetaDeGrupo } from './capa-propuesta.reglas';

/**
 * Reglas puras de cómo se ve la propuesta de Opttia fuera de "Mi operación" (D-422, tarea 4.6):
 *
 * - "Mi país": cada grupo de transportadora lleva un arco FIJO desde la bodega hasta la ciudad de
 *   sus pedidos mientras la propuesta siga en la tarjeta. Al aprobar, la tarjeta suelta la propuesta
 *   y el arco se borra: la salida real (evento del canal en vivo) dibuja su propio arco.
 * - "Pedidos": las tarjetas de los pedidos de la propuesta se marcan con el color de su grupo, y en
 *   cada columna la de más arriba de cada grupo (entre las que el tablero pinta) dice qué propone.
 *
 * Solo deciden QUÉ se marca. Sin three, sin Angular y sin DOM: se prueban con node suelto. Nada de
 * esto escribe ni mueve un pedido real.
 */

/** A lo sumo 6 arcos fijos a la vez en el mapa: más se vuelve ruido. */
export const MAX_ARCOS_PROPUESTA = 6;
/** A lo sumo 60 tarjetas marcadas en el tablero. */
export const MAX_MARCAS_PROPUESTA = 60;
/** Color de un grupo de transportadora sin color válido (el de las salidas del mapa). */
const RESPALDO_ARCO: ColorEscena = 'info';
/** Color de una marca sin color válido: el acento. */
const RESPALDO_MARCA: ColorEscena = 'accent';

// ── Mi país: arcos fijos ─────────────────────────────────────────────────────

/** Un destino de un grupo de transportadora. */
export interface ArcoPropuesta {
  /** Clave estable: si no cambia, la escena no rehace el arco. */
  clave: string;
  grupo: string;
  /** Código DANE de la ciudad de destino. */
  dane: string;
  /** Pedidos del grupo que van a esa ciudad. */
  pedidos: number;
  color: ColorEscena;
  /** true = arco desde la bodega; false = la ciudad es la misma de la bodega (o no hay bodega): solo el anillo del destino. */
  conArco: boolean;
}

/** La etiqueta de un grupo ("Cereza · 2"), sobre su primer arco. */
export interface EtiquetaArcos {
  grupo: string;
  texto: string;
  color: ColorEscena;
  /** Clave del arco sobre el que va. */
  clave: string;
}

export interface PlanArcos {
  arcos: ArcoPropuesta[];
  etiquetas: EtiquetaArcos[];
  /** Pedidos de transportadora que no se pueden dibujar (sin ciudad en el mapa). */
  sinCiudad: number;
}

/** Lo mínimo de la propuesta que usan los arcos. */
export type PropuestaArcos = Pick<PropuestaEnEscena, 'grupos'>;

function sinRepetir(ids: ReadonlyArray<unknown>): string[] {
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];
}

/**
 * Los arcos fijos de una propuesta en "Mi país": solo los grupos de transportadora, uno por ciudad
 * de destino (la que más pedidos lleva primero), con el color del grupo y a lo sumo `max` en total.
 * `ciudadDe` dice en qué ciudad (DANE) dibuja la escena cada pedido; `origen` es la ciudad de la
 * bodega (null = no se sabe: solo los anillos de los destinos). Un pedido cuenta una sola vez.
 */
export function arcosDePropuesta(
  p: PropuestaArcos | null | undefined,
  ciudadDe: (pedidoId: string) => string | null | undefined,
  origen: string | null,
  max = MAX_ARCOS_PROPUESTA
): PlanArcos {
  const plan: PlanArcos = { arcos: [], etiquetas: [], sinCiudad: 0 };
  if (!p) return plan;
  const tope = Math.max(0, Math.floor(max));
  const vistos = new Set<string>();
  for (const g of p.grupos ?? []) {
    if (!g || !g.transportadora || !Array.isArray(g.pedidos)) continue;
    const color = esColorGrupo(g.color) ? g.color : RESPALDO_ARCO;
    const porCiudad = new Map<string, number>();
    let n = 0;
    for (const id of sinRepetir(g.pedidos)) {
      if (vistos.has(id)) continue;
      vistos.add(id);
      n++;
      const dane = ciudadDe(id);
      if (!dane) {
        plan.sinCiudad++;
        continue;
      }
      porCiudad.set(dane, (porCiudad.get(dane) ?? 0) + 1);
    }
    const destinos = [...porCiudad.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    let primero: ArcoPropuesta | null = null;
    for (const [dane, pedidos] of destinos) {
      if (plan.arcos.length >= tope) break;
      const conArco = origen !== null && origen !== '' && dane !== origen;
      const arco: ArcoPropuesta = {
        clave: `${g.id}|${conArco ? origen : '-'}|${dane}|${color}`,
        grupo: g.id,
        dane,
        pedidos,
        color,
        conArco,
      };
      plan.arcos.push(arco);
      primero = primero ?? arco;
    }
    if (primero) plan.etiquetas.push({ grupo: g.id, texto: etiquetaDeGrupo(g, n), color, clave: primero.clave });
  }
  return plan;
}

// ── Pedidos: tarjetas marcadas ───────────────────────────────────────────────

/** Cómo se marca la tarjeta de un pedido de la propuesta. */
export interface MarcaPropuesta {
  grupo: string;
  color: ColorEscena;
  /** Lo que propone, sin montos ni datos del cliente ("Cereza · 2", "5 por arrancar"). */
  etiqueta: string;
}

/** Lo mínimo de la propuesta que usan las marcas. */
export type PropuestaMarcas = Pick<PropuestaEnEscena, 'id' | 'pedidos' | 'grupos' | 'etiqueta'>;

/**
 * Las tarjetas que el tablero marca para la propuesta a la vista: cada pedido con el color de su
 * grupo (el primer grupo que lo trae gana) y a lo sumo `max`. Una propuesta sin grupos marca sus
 * pedidos como un solo grupo. Con un solo grupo, el texto es la etiqueta de la propuesta (la misma
 * del orbe); con varios, la de cada grupo. null (sin propuesta) = ninguna marca.
 */
export function marcasDePropuesta(p: PropuestaMarcas | null | undefined, max = MAX_MARCAS_PROPUESTA): Map<string, MarcaPropuesta> {
  const marcas = new Map<string, MarcaPropuesta>();
  if (!p) return marcas;
  const tope = Math.max(0, Math.floor(max));
  const conPedidos = (p.grupos ?? []).filter((g) => g && Array.isArray(g.pedidos) && g.pedidos.length > 0);
  const respaldo: GrupoEnEscena[] = sinRepetir(p.pedidos ?? []).length
    ? [{ id: p.id, pedidos: sinRepetir(p.pedidos ?? []), veh: null, transportadora: false, color: RESPALDO_MARCA }]
    : [];
  const fuente = conPedidos.length ? conPedidos : respaldo;
  const propia = String(p.etiqueta ?? '').trim();
  for (const g of fuente) {
    const ids = sinRepetir(g.pedidos).filter((id) => !marcas.has(id));
    if (!ids.length) continue;
    const color = esColorGrupo(g.color) ? g.color : RESPALDO_MARCA;
    const etiqueta = fuente.length === 1 && propia ? propia : etiquetaDeGrupo(g, ids.length);
    for (let i = 0; i < ids.length && marcas.size < tope; i++) {
      marcas.set(ids[i], { grupo: g.id, color, etiqueta });
    }
  }
  return marcas;
}

/**
 * Qué tarjetas dicen en texto "Opttia propone: …": en cada columna, la de más arriba de cada grupo
 * ENTRE LAS QUE EL TABLERO PINTA (tope por columna y orden por tiempo en la etapa). Las demás del
 * grupo solo llevan el anillo. Así ninguna columna queda con anillos sin explicación, aunque el
 * primer pedido que mandó el servidor quede fuera del tope ("y N más") o no esté en la foto.
 * `columnas` son los ids de las tarjetas pintadas, columna por columna y de arriba abajo.
 */
export function tarjetasConTexto(
  columnas: ReadonlyArray<ReadonlyArray<string>>,
  marcas: ReadonlyMap<string, MarcaPropuesta>
): Set<string> {
  const conTexto = new Set<string>();
  if (!marcas.size) return conTexto;
  for (const ids of columnas) {
    const dichos = new Set<string>();
    for (const id of ids) {
      const m = marcas.get(id);
      if (!m || dichos.has(m.grupo)) continue;
      dichos.add(m.grupo);
      conTexto.add(id);
    }
  }
  return conTexto;
}
