/**
 * Períodos de Reportes (D-551 6.3, ticket 1347). Funciones PURAS, sin Angular ni `Date` local: todo en
 * días de Colombia (`AAAA-MM-DD`, UTC-5 fijo, sin horario de verano) y con la semana de lunes a domingo.
 *
 * Es la MISMA lógica que `functions/services/metricas/periodo.js` del backend (`periodoAnterior`,
 * `semanaDe`, `diaBogota`): la prueba `tests/reportes/periodos.test.js` usa la misma tabla de casos que
 * `tests/metricas/periodo.test.js`. El selector manda `{ desde, hasta, base }` como días de Colombia; ya no
 * `T00:00:00.000Z`, que corría el corte cinco horas.
 */

export type PresetPeriodo = 'hoy' | 'ayer' | 'semana' | 'mes' | 'mes_anterior' | 'ultimos_30' | 'anio' | 'personalizado';
export type ModoComparacion = 'ninguna' | 'periodo_anterior' | 'anio_pasado';

export interface Periodo {
  /** Primer día incluido, AAAA-MM-DD (hora de Colombia). */
  desde: string;
  /** Último día incluido, AAAA-MM-DD (hora de Colombia). */
  hasta: string;
}

export const PRESETS_PERIODO: ReadonlyArray<{ id: PresetPeriodo; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mes_anterior', label: 'Mes anterior' },
  { id: 'ultimos_30', label: 'Últimos 30 días' },
  { id: 'anio', label: 'Este año' },
  { id: 'personalizado', label: 'Personalizado' },
];

export const MODOS_COMPARACION: ReadonlyArray<{ id: ModoComparacion; label: string }> = [
  { id: 'ninguna', label: 'Sin comparación' },
  { id: 'periodo_anterior', label: 'Período anterior' },
  { id: 'anio_pasado', label: 'Mismo período del año pasado' },
];

const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000;
const MS_DIA = 24 * 60 * 60 * 1000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const dos = (n: number) => String(n).padStart(2, '0');
const aMs = (dia: string) => Date.parse(`${dia}T00:00:00Z`);
const sumarDias = (dia: string, n: number) => new Date(aMs(dia) + n * MS_DIA).toISOString().slice(0, 10);
const ultimoDiaDelMes = (anio: number, mes0: number) => new Date(Date.UTC(anio, mes0 + 1, 0)).getUTCDate();

/** ¿Es un día real del calendario con la forma AAAA-MM-DD? («2026-02-31» tiene la forma y no existe.) */
export function esDia(texto: unknown): texto is string {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const ms = aMs(texto);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === texto;
}

/** El día (AAAA-MM-DD) en hora de Colombia de un instante (ms, Date o texto ISO); null si no es una fecha. */
export function diaBogota(valor: number | Date | string): string | null {
  const ms = valor instanceof Date ? valor.getTime() : typeof valor === 'number' ? valor : Date.parse(valor);
  return Number.isFinite(ms) ? new Date(ms - OFFSET_BOGOTA_MS).toISOString().slice(0, 10) : null;
}

/** La semana de lunes a domingo que contiene `dia`. */
export function semanaDe(dia: string): Periodo {
  const diaSemana = new Date(aMs(dia)).getUTCDay(); // 0 = domingo
  const desdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
  const desde = sumarDias(dia, -desdeLunes);
  return { desde, hasta: sumarDias(desde, 6) };
}

/**
 * El período anterior (misma definición que el diccionario de métricas y el backend):
 *  - mes calendario completo, o mes en curso hasta hoy: los mismos días del mes anterior;
 *  - cualquier otro rango: los mismos días de largo inmediatamente antes.
 */
export function periodoAnterior(desde: string, hasta: string, ahoraMs: number = Date.now()): Periodo {
  if (desde > hasta) [desde, hasta] = [hasta, desde]; // rango invertido: se lee de menor a mayor
  const [a, m, d] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  if (a === a2 && m === m2 && d === 1) {
    const completo = d2 === ultimoDiaDelMes(a, m - 1);
    const hastaHoy = hasta === diaBogota(ahoraMs);
    if (completo || hastaHoy) {
      const mesAnterior = m === 1 ? 12 : m - 1;
      const anioAnterior = m === 1 ? a - 1 : a;
      const ultimo = ultimoDiaDelMes(anioAnterior, mesAnterior - 1);
      return { desde: `${anioAnterior}-${dos(mesAnterior)}-01`, hasta: `${anioAnterior}-${dos(mesAnterior)}-${dos(completo ? ultimo : Math.min(d2, ultimo))}` };
    }
  }
  const largo = Math.round((aMs(hasta) - aMs(desde)) / MS_DIA) + 1;
  return { desde: sumarDias(desde, -largo), hasta: sumarDias(desde, -1) };
}

/** Los mismos días un año antes (el 29 de febrero cae el 28 si el año anterior no es bisiesto). */
export function periodoAnioPasado(desde: string, hasta: string): Periodo {
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  const unAnioAntes = (dia: string) => {
    const [a, m, d] = dia.split('-').map(Number);
    return `${a - 1}-${dos(m)}-${dos(Math.min(d, ultimoDiaDelMes(a - 1, m - 1)))}`;
  };
  return { desde: unAnioAntes(desde), hasta: unAnioAntes(hasta) };
}

/**
 * El período que cubre un preset en el instante `ahoraMs` (hora de Colombia). «Esta semana», «Este mes» y
 * «Este año» van del primer día hasta hoy; «Últimos 30 días» son 30 días contando hoy. `personalizado`
 * devuelve el rango dado (en orden), o null si no es válido.
 */
export function periodoDePreset(preset: PresetPeriodo, ahoraMs: number = Date.now(), personalizado?: Periodo | null): Periodo | null {
  const hoy = diaBogota(ahoraMs);
  if (!hoy) return null;
  const [a, m] = hoy.split('-').map(Number);
  switch (preset) {
    case 'hoy': return { desde: hoy, hasta: hoy };
    case 'ayer': { const ayer = sumarDias(hoy, -1); return { desde: ayer, hasta: ayer }; }
    case 'semana': return { desde: semanaDe(hoy).desde, hasta: hoy };
    case 'mes': return { desde: `${a}-${dos(m)}-01`, hasta: hoy };
    case 'mes_anterior': {
      const mes = m === 1 ? 12 : m - 1;
      const anio = m === 1 ? a - 1 : a;
      return { desde: `${anio}-${dos(mes)}-01`, hasta: `${anio}-${dos(mes)}-${dos(ultimoDiaDelMes(anio, mes - 1))}` };
    }
    case 'ultimos_30': return { desde: sumarDias(hoy, -29), hasta: hoy };
    case 'anio': return { desde: `${a}-01-01`, hasta: hoy };
    case 'personalizado': {
      if (!personalizado || !esDia(personalizado.desde) || !esDia(personalizado.hasta)) return null;
      return personalizado.desde <= personalizado.hasta ? { ...personalizado } : { desde: personalizado.hasta, hasta: personalizado.desde };
    }
    default: return null;
  }
}

/** El período contra el que se compara, o null si no hay comparación. */
export function periodoDeComparacion(modo: ModoComparacion, periodo: Periodo, ahoraMs: number = Date.now()): Periodo | null {
  if (modo === 'periodo_anterior') return periodoAnterior(periodo.desde, periodo.hasta, ahoraMs);
  if (modo === 'anio_pasado') return periodoAnioPasado(periodo.desde, periodo.hasta);
  return null;
}

const fechaCorta = (dia: string) => { const [, m, d] = dia.split('-').map(Number); return `${d} de ${MESES[m - 1]}`; };

/** El subtítulo del período: «23 de octubre de 2026», «1 al 23 de octubre de 2026», «28 de diciembre de 2025 al 3 de enero de 2026». */
export function textoDelPeriodo(periodo: Periodo): string {
  const [a1, m1, d1] = periodo.desde.split('-').map(Number);
  const [a2, m2, d2] = periodo.hasta.split('-').map(Number);
  if (periodo.desde === periodo.hasta) return `${d1} de ${MESES[m1 - 1]} de ${a1}`;
  if (a1 === a2 && m1 === m2) return `${d1} al ${d2} de ${MESES[m2 - 1]} de ${a2}`;
  if (a1 === a2) return `${fechaCorta(periodo.desde)} al ${fechaCorta(periodo.hasta)} de ${a2}`;
  return `${fechaCorta(periodo.desde)} de ${a1} al ${fechaCorta(periodo.hasta)} de ${a2}`;
}

/** Lo que se manda al servidor: el período en días de Colombia con la fecha base. */
export function periodoParaServidor(periodo: Periodo, base: 'entrega' | 'creacion' = 'entrega'): { desde: string; hasta: string; base: 'entrega' | 'creacion' } {
  return { desde: periodo.desde, hasta: periodo.hasta, base };
}
