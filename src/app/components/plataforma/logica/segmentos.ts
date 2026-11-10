import { fechaCo, formatearCop, formatearRatio, SIN_VALOR } from './formato';
import { TEXTOS } from '../plataforma.textos';

/**
 * D-700 14.6 — Lo que se dice de cada comercio dentro de un segmento. El servidor manda las cifras; aquí solo se
 * escriben en palabras (nada se suma ni se recalcula).
 */
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function detalleSegmento(clave: string, datos: Record<string, unknown> | null | undefined): string {
  if (!datos) return SIN_VALOR;
  const n = (k: string) => (esNumero(datos[k]) ? (datos[k] as number) : null);
  switch (clave) {
    case 'nuevos_sin_primer_pedido':
      return n('antiguedadDias') === null ? SIN_VALOR : `${n('antiguedadDias')} días de alta, sin pedidos`;
    case 'pagan_sin_medio_de_pago':
      return 'Cobro manual: sin tarjeta inscrita';
    case 'premium_ventas_en_caida':
      return `Vendió ${formatearCop(n('gmv30d'))} en 30 días frente a ${formatearCop(n('gmvPrevios30d'))} en los 30 previos (${n('caida') === null ? SIN_VALOR : formatearRatio(n('caida'))} menos)`;
    case 'gratuitos_cerca_limite':
      return `${n('integraciones') ?? SIN_VALOR} de ${n('limite') ?? SIN_VALOR} integraciones`;
    case 'plan_vencido_o_por_vencer': {
      const d = n('diasRestantes');
      if (datos['estado'] === 'vencido') return d === null ? 'Vencido' : `Vencido hace ${Math.abs(d)} días`;
      return d === null ? 'Por vencer' : d === 0 ? 'Vence hoy' : `Vence en ${d} días`;
    }
    case 'gratis_que_usan_la_app':
      return TEXTOS.segmentos.gratisDetalle(n('pedidos30d'), fechaCo(typeof datos['ultimoIngreso'] === 'string' ? (datos['ultimoIngreso'] as string) : null, false));
    default:
      return SIN_VALOR;
  }
}
