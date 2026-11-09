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
  return String(v);
}

export function armarGrafico(nombre: string, unidad: string, puntos: PuntoTendencia[], acento = '#5F3FE0'): GraficoArmado {
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
  // Ejes y rejilla tenues (tintas que sirven en claro y oscuro); la serie va en el acento y el mes incompleto en su tinte.
  const TINTA_EJE = '#8A87A6';
  const REJILLA = 'rgba(138, 135, 166, 0.22)';
  const tinte = /^#[0-9a-fA-F]{6}$/.test(acento) ? `${acento}66` : acento;
  const corto = (v: string) => String(v).replace(/ 20(\d\d)$/, ' $1');
  const base = { connectNulls: false } as const;
  const series = esConteo
    ? [
        {
          ...base, name: 'Oficial', type: 'bar', barMaxWidth: 26, barGap: '-100%',
          data: lista.map((p) => {
            const v = valorGraficable(p);
            if (v === null || p.estado === 'reconstruido') return null;
            const incompleto = p.estado === 'parcial' || p.estado === 'en_curso';
            return { value: v, itemStyle: { color: incompleto ? tinte : acento, borderRadius: [4, 4, 0, 0] } };
          }) as never,
        },
        {
          ...base, name: 'Reconstruido', type: 'bar', barMaxWidth: 26, barGap: '-100%',
          data: reconstruido.map((r) => (r ? { value: (r as { value: number }).value } : null)) as never,
          itemStyle: { color: 'transparent', borderColor: acento, borderType: 'dashed', borderWidth: 1.5, borderRadius: [4, 4, 0, 0] },
        },
      ]
    : [
        { ...base, name: 'Oficial', type: 'line', data: oficial as never, symbolSize: 8, smooth: false, lineStyle: { type: 'solid', width: 2 }, itemStyle: { borderColor: '#ffffff', borderWidth: 1.5 } },
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
    legend: { show: hayReconstruido, bottom: 0, left: 'center', itemWidth: 16, itemHeight: 8, textStyle: { color: TINTA_EJE, fontSize: 11 } },
    grid: { left: 4, right: 12, top: 12, bottom: hayReconstruido ? 32 : 4, containLabel: true },
    xAxis: {
      type: 'category', data: etiquetas, boundaryGap: esConteo,
      axisTick: { show: false }, axisLine: { lineStyle: { color: REJILLA } },
      axisLabel: { rotate: 0, color: TINTA_EJE, fontSize: 11, hideOverlap: true, formatter: corto },
    },
    yAxis: {
      type: 'value', splitNumber: 4, minInterval: esConteo ? 1 : 0,
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
  return { hayDatos, resultado, ajustes, filas, resumen };
}
