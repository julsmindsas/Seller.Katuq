import { EChartsOption } from 'echarts';
import { ReportResult } from '../../dashboard/model/report-spec.interfaces';
import { PuntoTendencia } from '../plataforma.tipos';
import { formatearCop, formatearNumero, mesLegible, rotuloEstado, SIN_VALOR } from './formato';

/**
 * D-700 13.5 — De los puntos del servidor `{mes, valor, estado}` al gráfico (sobre `VizChart`) y a su tabla.
 * Reglas: `sin dato` es un hueco (nunca 0); el mes `reconstruido` va en línea punteada con marcador hueco; la
 * forma del marcador distingue el estado (no solo el color).
 */
export interface FilaTablaTendencia {
  mes: string;
  etiqueta: string;
  texto: string;
  estado: string;
  insignia: string | null;
}

export interface GraficoArmado {
  hayDatos: boolean;
  /** Todos los meses con dato valen 0: se muestra «sin movimiento» en lugar de un eje inventado. */
  sinMovimiento: boolean;
  /** Hay algún mes parcial o en curso (barra en tono claro, tramo punteado). */
  hayIncompleto: boolean;
  /** El último mes con dato es parcial o en curso. */
  ultimoIncompleto: boolean;
  resultado: ReportResult;
  ajustes: EChartsOption;
  filas: FilaTablaTendencia[];
  resumen: string;
}

const SIN_VALOR_ESTADOS = ['sin_dato', 'no_disponible'];

/** Valor graficable: `null` si no hay dato (aunque el servidor mande un número con estado sin dato). */
export function valorGraficable(p: PuntoTendencia): number | null {
  if (SIN_VALOR_ESTADOS.includes(String(p.estado))) return null;
  return typeof p.valor === 'number' && Number.isFinite(p.valor) ? p.valor : null;
}

function textoValor(valor: number | null, unidad: string): string {
  if (valor === null) return SIN_VALOR;
  return unidad === 'COP' ? formatearCop(valor) : formatearNumero(valor);
}

const SIMBOLO: Record<string, string> = { ok: 'circle', parcial: 'triangle', en_curso: 'rect', reconstruido: 'emptyCircle' };

export function abreviarCop(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} mil M`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} M`;
  if (a >= 1e3) return `${Math.round(v / 1e3)} mil`;
  return String(Math.round(v));
}

export interface TintasGrafico {
  /** Texto de los ejes y la leyenda (contraste AA sobre la tarjeta). */
  eje: string;
  /** Rejilla y línea del eje. */
  rejilla: string;
  /** Borde de los puntos (el fondo de la tarjeta). */
  borde: string;
}

const TINTAS_POR_DEFECTO: TintasGrafico = { eje: '#5b5878', rejilla: '#ececf4', borde: '#ffffff' };
const INCOMPLETO = ['parcial', 'en_curso'];

function legendaNombres(esConteo: boolean, hayReconstruido: boolean, hayTramo: boolean): string[] {
  const n = ['Oficial'];
  if (!esConteo && hayTramo) n.push('Incompleto');
  if (hayReconstruido) n.push('Reconstruido');
  return n;
}

export function armarGrafico(nombre: string, unidad: string, puntos: PuntoTendencia[], acento = '#5F3FE0', tintas: Partial<TintasGrafico> = {}): GraficoArmado {
  const { eje: TINTA_EJE, rejilla: REJILLA, borde: BORDE } = { ...TINTAS_POR_DEFECTO, ...tintas };
  const lista = Array.isArray(puntos) ? puntos : [];
  const filas: FilaTablaTendencia[] = lista.map((p) => {
    const v = valorGraficable(p);
    return { mes: p.mes, etiqueta: mesLegible(p.mes), texto: textoValor(v, unidad), estado: String(p.estado), insignia: v === null ? rotuloEstado('sin_dato') : rotuloEstado(String(p.estado)) };
  });
  const etiquetas = filas.map((f) => f.etiqueta);

  const oficial = lista.map((p) => {
    const v = valorGraficable(p);
    return v !== null && p.estado !== 'reconstruido' ? { value: v, symbol: SIMBOLO[String(p.estado)] || 'circle' } : null;
  });
  const reconstruido = lista.map((p) => {
    const v = valorGraficable(p);
    return v !== null && p.estado === 'reconstruido' ? { value: v, symbol: SIMBOLO.reconstruido } : null;
  });
  const hayDatos = lista.some((p) => valorGraficable(p) !== null);
  const conValor = lista.filter((p) => valorGraficable(p) !== null);
  const sinMovimiento = hayDatos && conValor.every((p) => valorGraficable(p) === 0);
  const hayIncompleto = conValor.some((p) => INCOMPLETO.includes(String(p.estado)));
  const ultimaPos = lista.length - 1 - [...lista].reverse().findIndex((p) => valorGraficable(p) !== null);
  const ultimoIncompleto = hayDatos && INCOMPLETO.includes(String(lista[ultimaPos].estado));

  const resultado: ReportResult = {
    columns: [
      { field: 'mes', label: 'Mes', type: 'dimension', dataType: 'string' },
      { field: 'valor', label: nombre, type: 'measure', dataType: 'number' },
    ],
    // Las filas solo fijan las etiquetas del eje: las series reales van en `ajustes` (con huecos).
    rows: lista.map((p, i) => ({ mes: etiquetas[i], valor: valorGraficable(p) })),
    meta: { totalRows: lista.length, truncated: false, sourceUsed: 'plataforma', durationMs: 0 },
  };

  const formatoEje = (v: number) => (unidad === 'COP' ? abreviarCop(v) : formatearNumero(v));
  const hayReconstruido = lista.some((p) => p.estado === 'reconstruido' && valorGraficable(p) !== null);
  const esConteo = unidad !== 'COP';
  // Ejes y rejilla con las tintas del tema; la serie va en el acento y el mes incompleto en su tinte.
  const corto = (v: string) => String(v).replace(/ 20(\d\d)$/, ' $1');
  const base = { connectNulls: false } as const;
  // En líneas de pesos, el último mes incompleto sale de la serie sólida y se dibuja aparte, unido al mes previo con trazo punteado.
  const idxIncompleto = ultimoIncompleto ? ultimaPos : -1;
  const oficialSinUltimo = oficial.map((o, i) => (i === idxIncompleto ? null : o));
  const tramoIncompleto = lista.map((_, i) => {
    if (idxIncompleto < 0) return null;
    if (i === idxIncompleto) return { value: valorGraficable(lista[i]) as number, symbol: 'emptyCircle' };
    const previo = idxIncompleto - 1;
    if (i === previo && oficial[previo]) return { value: (oficial[previo] as { value: number }).value, symbol: 'none' };
    return null;
  });
  const series = esConteo
    ? [
        {
          ...base, name: 'Oficial', type: 'bar', barMaxWidth: 26, barGap: '-100%',
          data: lista.map((p) => {
            const v = valorGraficable(p);
            if (v === null || p.estado === 'reconstruido') return null;
            const incompleto = p.estado === 'parcial' || p.estado === 'en_curso';
            return { value: v, itemStyle: { color: acento, opacity: incompleto ? 0.4 : 1, borderRadius: [4, 4, 0, 0] } };
          }) as never,
        },
        {
          ...base, name: 'Reconstruido', type: 'bar', barMaxWidth: 26, barGap: '-100%',
          data: reconstruido.map((r) => (r ? { value: (r as { value: number }).value } : null)) as never,
          itemStyle: { color: 'transparent', borderColor: acento, borderType: 'dashed', borderWidth: 1.5, borderRadius: [4, 4, 0, 0] },
        },
      ]
    : [
        { ...base, name: 'Oficial', type: 'line', data: oficialSinUltimo as never, symbolSize: 8, smooth: false, lineStyle: { type: 'solid', width: 2 }, itemStyle: { borderColor: BORDE, borderWidth: 1.5 } },
        // Mes en curso: el tramo hacia él va punteado y con marcador hueco (no se une como si fuera un mes cerrado).
        { ...base, name: 'Incompleto', type: 'line', data: tramoIncompleto as never, symbolSize: 8, smooth: false, lineStyle: { type: 'dashed', width: 2 }, itemStyle: { borderWidth: 2 } },
        { ...base, name: 'Reconstruido', type: 'line', data: reconstruido as never, symbolSize: 8, smooth: false, lineStyle: { type: 'dashed', width: 2 }, itemStyle: { borderWidth: 2 } },
      ];
  const ajustes: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: esConteo ? 'shadow' : 'line', lineStyle: { color: REJILLA } },
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? (params as Array<{ dataIndex: number }>) : [];
        const i = arr.length ? arr[0].dataIndex : -1;
        const f = filas[i];
        return f ? `${f.etiqueta}: <b>${f.texto}</b>${f.insignia && f.texto !== SIN_VALOR ? ` (${f.insignia})` : ''}` : '';
      },
    },
    legend: { show: hayReconstruido || (!esConteo && idxIncompleto >= 0), data: legendaNombres(esConteo, hayReconstruido, idxIncompleto >= 0), bottom: 0, left: 'center', itemWidth: 16, itemHeight: 8, textStyle: { color: TINTA_EJE, fontSize: 11 } },
    grid: { left: 4, right: 12, top: 12, bottom: (hayReconstruido || (!esConteo && idxIncompleto >= 0)) ? 32 : 4, containLabel: true },
    xAxis: {
      type: 'category', data: etiquetas, boundaryGap: esConteo,
      axisTick: { show: false }, axisLine: { lineStyle: { color: REJILLA } },
      axisLabel: { rotate: 0, color: TINTA_EJE, fontSize: 11, hideOverlap: true, formatter: corto },
    },
    yAxis: {
      type: 'value', splitNumber: 4, minInterval: 1, min: 0,
      axisLabel: { formatter: formatoEje, color: TINTA_EJE, fontSize: 11 },
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: REJILLA, type: 'solid' } },
    },
    series: series as never,
  };

  const conDato = filas.filter((f) => f.texto !== SIN_VALOR);
  const ultimo = conDato.length ? conDato[conDato.length - 1] : null;
  const resumen = hayDatos && ultimo
    ? `${nombre}, ${filas.length} meses, ${conDato.length} con dato; el último, ${ultimo.etiqueta}: ${ultimo.texto}.`
    : `${nombre}: sin dato en los ${filas.length} meses.`;
  return { hayDatos, sinMovimiento, hayIncompleto, ultimoIncompleto, resultado, ajustes, filas, resumen };
}
