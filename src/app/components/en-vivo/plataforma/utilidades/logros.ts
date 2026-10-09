import { CifrasGlobalEnVivo, RadarEnVivo } from '../../servicios/en-vivo.modelos';
import { decimal, diaYMes, dineroCorto, entero, horaCorta } from '../../utilidades/formato';
import { IconoId } from '../../utilidades/iconos';

/**
 * Récords y proyección de toda Katuq (spec `radar-en-vivo`, "Proyección y récords"): hacia dónde va
 * el día, el récord de pedidos de los últimos 90 días con su fecha, la mejor hora, el ritmo récord y
 * lo vendido con Opttia. Puro: la proyección y el récord los calcula el servidor (`radar.proyeccion`,
 * `radar.record`); las demás cifras son `cifrasGlobal`.
 */

/** Una línea de logro: `antes` + `<b>negrita</b>` + `despues` (sin HTML en el texto). */
export interface LogroVista {
  clave: 'record' | 'mejor-hora' | 'opttia' | 'ritmo';
  icono: IconoId;
  /** `t-warn`, `t-accent`, `t-pack`, `t-ok`. */
  clase: string;
  antes: string;
  negrita: string;
  despues: string;
}

export interface VistaLogros {
  /** Hay proyección del servidor (si no, "Calculando..."). */
  hayProyeccion: boolean;
  etiqueta: string;
  /** "$3,4 M" o, con la privacidad, "120 pedidos". */
  grande: string;
  /** "≈ 120 pedidos · " (vacío con la privacidad: ya va en grande). */
  prefijo: string;
  /** "faltarían 20 para el récord" o "¡pinta récord!". */
  subtexto: string;
  /** La proyección alcanza o pasa el récord. */
  pintaRecord: boolean;
  items: LogroVista[];
}

/**
 * ¿La proyección de pedidos pasa el récord de 90 días? null si falta alguno de los dos datos.
 * Es la misma regla que usa el comercio para celebrar (`>` estricto).
 */
export function vaAlRecord(radar: RadarEnVivo | null | undefined): boolean | null {
  const proyeccion = radar?.proyeccion;
  const record = radar?.record;
  if (!proyeccion || !record || !(record.n > 0)) return null;
  return proyeccion.pedidos > record.n;
}

/** Solo cuenta como "cruzó" si antes se sabía que NO iba al récord y ahora sí: nunca al cargar. */
export function cruzoElRecord(previo: boolean | null, actual: boolean | null): boolean {
  return previo === false && actual === true;
}

export const TEXTO_RECORD_KATUQ = '¡Katuq va camino a su récord de pedidos!';

export function armarLogros(
  radar: RadarEnVivo | null | undefined,
  cifras: CifrasGlobalEnVivo | null | undefined,
  ocultar: boolean
): VistaLogros {
  const proyeccion = radar?.proyeccion ?? null;
  const record = radar?.record ?? null;
  const pintaRecord = !!proyeccion && !!record && proyeccion.pedidos >= record.n;

  let subtexto = '';
  if (proyeccion && record) {
    subtexto = pintaRecord
      ? '¡pinta récord!'
      : `faltarían ${entero(Math.max(0, Math.round(record.n - proyeccion.pedidos)))} para el récord`;
  }

  const items: LogroVista[] = [];

  items.push(
    record
      ? {
          clave: 'record',
          icono: 'trofeo',
          clase: 't-warn',
          antes: 'Récord de pedidos en 90 días: ',
          negrita: entero(record.n),
          despues: `, el ${diaYMes(record.fecha)}`,
        }
      : {
          clave: 'record',
          icono: 'trofeo',
          clase: 't-warn',
          antes: 'Todavía no hay un récord de pedidos registrado',
          negrita: '',
          despues: '',
        }
  );

  const mejor = cifras?.mejorHora ?? null;
  items.push(
    mejor
      ? {
          clave: 'mejor-hora',
          icono: 'rayo',
          clase: 't-accent',
          antes: 'Mejor hora de hoy: ',
          negrita: horaCorta(mejor.hora),
          despues: ` · ${entero(mejor.pedidos)} ${mejor.pedidos === 1 ? 'pedido' : 'pedidos'}`,
        }
      : {
          clave: 'mejor-hora',
          icono: 'rayo',
          clase: 't-accent',
          antes: 'Todavía no hay una mejor hora hoy',
          negrita: '',
          despues: '',
        }
  );

  const ia = cifras?.opttia ?? null;
  items.push(
    ia && ia.pedidos > 0
      ? {
          clave: 'opttia',
          icono: 'ia',
          clase: 't-pack',
          antes: 'Opttia ayudó a vender ',
          negrita: ocultar ? `${entero(ia.pedidos)} ${ia.pedidos === 1 ? 'pedido' : 'pedidos'}` : dineroCorto(ia.ventas),
          despues: ' por WhatsApp',
        }
      : {
          clave: 'opttia',
          icono: 'ia',
          clase: 't-pack',
          antes: 'Opttia todavía no ha armado pedidos hoy',
          negrita: '',
          despues: '',
        }
  );

  const ritmo = cifras?.ritmoRecord ?? null;
  items.push(
    ritmo
      ? {
          clave: 'ritmo',
          icono: 'pulso',
          clase: 't-ok',
          antes: 'Ritmo récord de hoy: ',
          negrita: decimal(ritmo.porMinuto),
          despues: ' pedidos por minuto',
        }
      : {
          clave: 'ritmo',
          icono: 'pulso',
          clase: 't-ok',
          antes: 'Todavía no hay un ritmo récord hoy',
          negrita: '',
          despues: '',
        }
  );

  return {
    hayProyeccion: proyeccion !== null,
    etiqueta: 'Si el ritmo sigue, hoy cierra en',
    grande: proyeccion ? (ocultar ? `${entero(proyeccion.pedidos)} pedidos` : dineroCorto(proyeccion.ventas)) : '—',
    prefijo: proyeccion && !ocultar ? `≈ ${entero(proyeccion.pedidos)} pedidos · ` : '',
    subtexto,
    pintaRecord,
    items,
  };
}
