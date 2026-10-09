import { dineroCorto, formatearCifra, iniciales } from '../../utilidades/formato';

/**
 * Nombres y rótulos de los comercios en la vista de toda Katuq. Todo puro (sin Angular).
 *
 * "Ocultar comercios y montos" (spec `tablero-en-vivo-plataforma`, Privacidad): los nombres pasan a
 * "Comercio en <ciudad>" y el dinero pasa a conteos. Aquí vive la regla UNA sola vez para que la
 * carrera, la cinta, el muro, el radar y el comercio del momento no la repitan cada uno.
 */

/** Lo mínimo de un comercio para nombrarlo. */
export interface IdentidadComercio {
  nombre: string | null | undefined;
  ciudad: string | null | undefined;
}

/** Lo que sale cuando una pieza abre el tablero de un comercio (además de avisar por `acciones$`). */
export interface AperturaComercio {
  /** Llave de la empresa (la que va en `?empresa=`). */
  empresa: string;
  /** Nombre real del comercio (quien lo muestre decide si lo oculta). */
  nombre: string;
  /** `atascados`: abrirlo mostrando sus pedidos listos que esperan. */
  foco?: 'atascados';
}

/** Ciudad lista para decir en voz alta: sin ella, "Colombia" (igual que `describirEvento`). */
export function ciudadVisible(ciudad: string | null | undefined): string {
  return String(ciudad ?? '').trim() || 'Colombia';
}

/** "Café Altamira", o con la privacidad encendida "Comercio en Medellín". */
export function nombreVisible(comercio: IdentidadComercio, ocultar: boolean): string {
  if (ocultar) return `Comercio en ${ciudadVisible(comercio.ciudad)}`;
  return String(comercio.nombre ?? '').trim() || 'Comercio';
}

/** Iniciales para el avatar: las del nombre, o con la privacidad las dos primeras letras de la ciudad. */
export function inicialesVisibles(comercio: IdentidadComercio, ocultar: boolean): string {
  if (ocultar) {
    const ciudad = String(comercio.ciudad ?? '').trim();
    return ciudad ? ciudad.slice(0, 2).toUpperCase() : 'CO';
  }
  return iniciales(comercio.nombre);
}

/** "$3,4 M" o, con la privacidad, "12 pedidos" (el dinero nunca sale). */
export function valorCorto(ventas: number, pedidos: number, ocultar: boolean): string {
  return ocultar ? formatearCifra(pedidos, 'pedidos') : dineroCorto(ventas);
}

const CLASES_DE_COMERCIO: ReadonlyArray<string> = ['t-accent', 't-info', 't-pack', 't-ok', 't-warn'];

/** Hash corto y estable (djb2) para repartir colores sin que cambien entre cargas. */
function hashDe(clave: string): number {
  let h = 5381;
  for (let i = 0; i < clave.length; i++) h = ((h << 5) + h + clave.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Color estable de un comercio (el mismo siempre, en la carrera, la cinta y el muro). */
export function claseDeComercio(empresa: string): string {
  return CLASES_DE_COMERCIO[hashDe(empresa) % CLASES_DE_COMERCIO.length];
}

/**
 * Orden de DOM estable: lo que ya estaba conserva su lugar, lo nuevo va al final y lo que se fue
 * se quita. Sirve para mover cosas con `transform` (la carrera) o no brincar de sitio (el muro):
 * si el navegador moviera el nodo en el DOM, la animación se perdería.
 */
export function mantenerOrdenEstable(previo: ReadonlyArray<string>, actual: ReadonlyArray<string>): string[] {
  const vigentes = new Set(actual);
  const salida = previo.filter((clave) => vigentes.has(clave));
  const yaEstan = new Set(salida);
  for (const clave of actual) {
    if (!yaEstan.has(clave)) {
      salida.push(clave);
      yaEstan.add(clave);
    }
  }
  return salida;
}
