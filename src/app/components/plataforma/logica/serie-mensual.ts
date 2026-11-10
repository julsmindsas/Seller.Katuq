import { MesSerie, PuntoTendencia, SerieMensual } from '../plataforma.tipos';
import { formatearCop, formatearNumero, mesLegible, rotuloEstado, SIN_VALOR } from './formato';

/**
 * D-700 19.7c — De la serie mensual de pedidos de una empresa (sección `uso` de la ficha) al gráfico de tendencia y a su tabla por canal.
 * El front solo pinta: un mes sin cierre llega como `sin_dato` (hueco, nunca 0) y un mes reconstruido se rotula como tal.
 */
export interface FilaSerie {
  mes: string;
  etiqueta: string;
  pedidos: string;
  gmv: string;
  canales: string;
  estado: string;
  insignia: string | null;
}

const MAX_CANALES_VISIBLES = 3;

const valorNumero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Puntos de pedidos por mes, en el formato que pinta `GraficoTendenciaComponent`. */
export function puntosDePedidos(serie: SerieMensual | null | undefined): PuntoTendencia[] {
  const meses = serie && Array.isArray(serie.meses) ? serie.meses : [];
  return meses.map((m) => {
    const v = valorNumero(m.pedidos);
    return { mes: m.mes, valor: v, estado: v === null ? 'sin_dato' : m.estado, unidad: 'n' };
  });
}

/** «E-commerce 899 · POS 101» (los 3 canales con más pedidos y «+N más»). Sin canales: «—». */
export function textoCanales(m: Pick<MesSerie, 'canales'>): string {
  const lista = (Array.isArray(m.canales) ? m.canales : [])
    .filter((c) => c && valorNumero(c.pedidos) !== null)
    .sort((a, b) => (b.pedidos as number) - (a.pedidos as number));
  if (!lista.length) return SIN_VALOR;
  const visibles = lista.slice(0, MAX_CANALES_VISIBLES).map((c) => `${c.canal || 'sin canal'} ${formatearNumero(c.pedidos)}`);
  const resto = lista.length - visibles.length;
  return resto > 0 ? `${visibles.join(' · ')} · +${resto} más` : visibles.join(' · ');
}

/** Filas de la tabla: los 12 meses, del más viejo al más nuevo. */
export function filasDeSerie(serie: SerieMensual | null | undefined): FilaSerie[] {
  const meses = serie && Array.isArray(serie.meses) ? serie.meses : [];
  return meses.map((m) => {
    const sinDato = valorNumero(m.pedidos) === null;
    return {
      mes: m.mes,
      etiqueta: mesLegible(m.mes),
      pedidos: sinDato ? SIN_VALOR : formatearNumero(m.pedidos),
      gmv: sinDato ? SIN_VALOR : formatearCop(valorNumero(m.gmv)),
      canales: sinDato ? SIN_VALOR : textoCanales(m),
      estado: sinDato ? 'sin_dato' : String(m.estado),
      insignia: sinDato ? rotuloEstado('sin_dato') : m.estado === 'ok' ? null : rotuloEstado(String(m.estado)),
    };
  });
}

/** ¿Algún mes tiene dato? Con `no_leido` la serie trae solo el mes en curso. */
export function hayDatosSerie(serie: SerieMensual | null | undefined): boolean {
  return puntosDePedidos(serie).some((p) => p.valor !== null);
}

/** Meses con dato además del mes en curso (para decir «aún no hay cierres»). */
export function mesesCerradosConDato(serie: SerieMensual | null | undefined): number {
  const meses = serie && Array.isArray(serie.meses) ? serie.meses : [];
  return meses.filter((m) => m.estado !== 'en_curso' && valorNumero(m.pedidos) !== null).length;
}
