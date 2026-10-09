import { CifraPorCanal } from '../../servicios/en-vivo.modelos';
import { entero } from '../../utilidades/formato';
import { claveDeTexto } from '../../servicios/en-vivo-reglas';

/**
 * De dónde llegan los pedidos en toda Katuq: la mezcla de canales (barra partida) y una barra por
 * canal, más lo vendido con Opttia. Puro: los conteos son los del servidor (`cifrasGlobal.porCanal`).
 */

export interface FilaCanal {
  canal: string;
  clase: string;
  pedidos: number;
  /** Porcentaje de los pedidos de hoy, entero. */
  pct: number;
  /** "23 · 18 %". */
  texto: string;
  /** Largo de la barra respecto al canal que más trae, de 0 a 100. */
  ancho: number;
}

export interface ConOpttia {
  pedidos: number;
  /** "12 % del día" (de los pedidos de hoy). */
  texto: string;
  etiqueta: string;
}

export interface VistaCanales {
  filas: FilaCanal[];
  total: number;
  /** null si hoy Opttia no armó ningún pedido. */
  conOpttia: ConOpttia | null;
}

const CLASES_DE_RESPALDO: ReadonlyArray<string> = ['t-accent', 't-info', 't-pack', 't-ok', 't-warn'];

/** Color de un canal: los conocidos fijos, el resto por hash estable (el mismo siempre). */
export function claseDeCanal(canal: string): string {
  const clave = claveDeTexto(canal);
  if (clave === 'pos') return 't-warn';
  if (clave.indexOf('whatsapp') !== -1) return 't-ok';
  if (clave.indexOf('shopify') !== -1) return 't-accent';
  if (clave.indexOf('instagram') !== -1) return 't-pack';
  if (clave.indexOf('asistida') !== -1 || clave.indexOf('seller') !== -1) return 't-info';
  let h = 5381;
  for (let i = 0; i < clave.length; i++) h = ((h << 5) + h + clave.charCodeAt(i)) | 0;
  return CLASES_DE_RESPALDO[Math.abs(h) % CLASES_DE_RESPALDO.length];
}

export function armarCanales(
  porCanal: ReadonlyArray<CifraPorCanal> | null | undefined,
  opttia: { pedidos: number; ventas: number } | null | undefined
): VistaCanales {
  const lista = (porCanal ?? [])
    .filter((c) => !!c && c.pedidos > 0)
    .slice()
    .sort((a, b) => b.pedidos - a.pedidos || String(a.canal).localeCompare(String(b.canal)));
  const total = lista.reduce((suma, c) => suma + c.pedidos, 0);
  const mayor = Math.max(1, lista.length > 0 ? lista[0].pedidos : 1);

  const filas = lista.map((c): FilaCanal => {
    const pct = total > 0 ? Math.round((c.pedidos / total) * 100) : 0;
    return {
      canal: c.canal,
      clase: claseDeCanal(c.canal),
      pedidos: c.pedidos,
      pct,
      texto: `${entero(c.pedidos)} · ${pct} %`,
      ancho: Math.round((c.pedidos / mayor) * 1000) / 10,
    };
  });

  let conOpttia: ConOpttia | null = null;
  if (opttia && opttia.pedidos > 0) {
    const pct = total > 0 ? Math.min(100, Math.round((opttia.pedidos / total) * 100)) : 0;
    conOpttia = {
      pedidos: opttia.pedidos,
      texto: total > 0 ? `${pct} % del día` : '',
      etiqueta: `${entero(opttia.pedidos)} con Opttia`,
    };
  }
  return { filas, total, conOpttia };
}
