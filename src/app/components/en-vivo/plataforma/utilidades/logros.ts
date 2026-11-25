import { CifrasGlobalEnVivo, RadarEnVivo } from '../../servicios/en-vivo.modelos';
import { decimal, diaYMes, dineroCorto, entero, formatearCifra, horaCorta } from '../../utilidades/formato';
import { IconoId } from '../../utilidades/iconos';
import { Traductor } from '../../utilidades/traductor';

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

/** Clave del aviso de celebración; el componente la traduce al emitirlo. */
export const CLAVE_RECORD_KATUQ = 'enVivo.plataforma.recordKatuq';

/**
 * Parte un texto traducido en `antes`, `negrita` y `despues` por los marcadores `**`: así cada logro
 * es UNA frase en el diccionario y el inglés puede ordenar las palabras como necesite.
 */
export function partirNegrita(texto: string): { antes: string; negrita: string; despues: string } {
  const partes = texto.split('**');
  if (partes.length < 3) return { antes: texto, negrita: '', despues: '' };
  return { antes: partes[0], negrita: partes[1], despues: partes.slice(2).join('') };
}

export function armarLogros(
  radar: RadarEnVivo | null | undefined,
  cifras: CifrasGlobalEnVivo | null | undefined,
  ocultar: boolean,
  t: Traductor
): VistaLogros {
  const proyeccion = radar?.proyeccion ?? null;
  const record = radar?.record ?? null;
  const pintaRecord = !!proyeccion && !!record && proyeccion.pedidos >= record.n;

  let subtexto = '';
  if (proyeccion && record) {
    subtexto = pintaRecord
      ? t('enVivo.plataforma.logrosPintaRecord')
      : t('enVivo.plataforma.logrosFaltarian', { n: entero(Math.max(0, Math.round(record.n - proyeccion.pedidos))) });
  }

  const items: LogroVista[] = [];

  items.push(
    record
      ? {
          clave: 'record',
          icono: 'trofeo',
          clase: 't-warn',
          ...partirNegrita(t('enVivo.plataforma.logrosRecord', { n: entero(record.n), fecha: diaYMes(record.fecha, t) })),
        }
      : {
          clave: 'record',
          icono: 'trofeo',
          clase: 't-warn',
          antes: t('enVivo.plataforma.logrosRecordSin'),
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
          ...partirNegrita(
            t('enVivo.plataforma.logrosMejorHora', { hora: horaCorta(mejor.hora, t), pedidos: formatearCifra(mejor.pedidos, 'pedidos', t) })
          ),
        }
      : {
          clave: 'mejor-hora',
          icono: 'rayo',
          clase: 't-accent',
          antes: t('enVivo.plataforma.logrosMejorHoraSin'),
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
          ...partirNegrita(
            t('enVivo.plataforma.logrosOpttia', {
              valor: ocultar ? formatearCifra(ia.pedidos, 'pedidos', t) : dineroCorto(ia.ventas, t),
            })
          ),
        }
      : {
          clave: 'opttia',
          icono: 'ia',
          clase: 't-pack',
          antes: t('enVivo.plataforma.logrosOpttiaSin'),
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
          ...partirNegrita(t('enVivo.plataforma.logrosRitmo', { valor: decimal(ritmo.porMinuto) })),
        }
      : {
          clave: 'ritmo',
          icono: 'pulso',
          clase: 't-ok',
          antes: t('enVivo.plataforma.logrosRitmoSin'),
          negrita: '',
          despues: '',
        }
  );

  return {
    hayProyeccion: proyeccion !== null,
    etiqueta: t('enVivo.plataforma.logrosSiElRitmoSigue'),
    grande: proyeccion
      ? ocultar
        ? formatearCifra(proyeccion.pedidos, 'pedidos', t)
        : dineroCorto(proyeccion.ventas, t)
      : '—',
    prefijo: proyeccion && !ocultar ? t('enVivo.plataforma.logrosPrefijo', { pedidos: formatearCifra(proyeccion.pedidos, 'pedidos', t) }) : '',
    subtexto,
    pintaRecord,
    items,
  };
}
