import { ProyeccionCierre, RecordPedidos } from '../servicios/en-vivo.modelos';
import { diaYMes, dineroCorto, entero } from './formato';
import { Traductor } from './traductor';

/**
 * Geometría y textos de la barra "Proyección al cierre": hoy / lo que falta según el ritmo /
 * récord. La proyección y el récord SIEMPRE los manda el servidor (`radar.proyeccion`,
 * `radar.record`); aquí solo se reparte el ancho de la barra. Puro.
 */
export interface BarraProyeccion {
  /** % de la barra que ya se llevó hoy (pedidos). */
  hoy: number;
  /** % donde empieza "lo que falta" y su ancho. */
  faltaDesde: number;
  falta: number;
  /** % donde cae la marca del récord (null si no hay récord). */
  record: number | null;
  /** "≈ $3,4 M · 120 pedidos" o, con los montos ocultos, "≈ 120 pedidos". */
  texto: string;
  /** "Récord: 140 pedidos (25 de septiembre)". */
  textoRecord: string;
  /** true si a este ritmo se pasa el récord. */
  superaRecord: boolean;
  /** Para lectores de pantalla. */
  accesible: string;
}

export function calcularBarraProyeccion(
  pedidosHoy: number,
  proyeccion: ProyeccionCierre | null,
  record: RecordPedidos | null,
  ocultar: boolean,
  t: Traductor
): BarraProyeccion | null {
  if (!proyeccion) return null;
  const proyectados = Math.max(0, proyeccion.pedidos);
  const tope = Math.max(record?.n ?? 0, proyectados, pedidosHoy, 1) * 1.06;
  const pct = (n: number): number => Math.max(0, Math.min(100, (n / tope) * 100));
  const hoy = pct(pedidosHoy);
  const superaRecord = !!record && proyectados > record.n;

  const texto = ocultar
    ? t('enVivo.proyeccion.aproxPedidos', { pedidos: entero(proyectados) })
    : t('enVivo.proyeccion.aproxMontoPedidos', { monto: dineroCorto(proyeccion.ventas, t), pedidos: entero(proyectados) });
  const textoRecord = record
    ? t('enVivo.proyeccion.record', { n: entero(record.n), fecha: diaYMes(record.fecha, t) })
    : t('enVivo.proyeccion.sinRecord');
  const accesible = !record
    ? t('enVivo.proyeccion.accesible', { texto })
    : superaRecord
    ? t('enVivo.proyeccion.accesibleSupera', { texto })
    : t('enVivo.proyeccion.accesibleFalta', { texto, n: entero(Math.max(0, record.n - proyectados)) });

  return {
    hoy,
    faltaDesde: hoy,
    falta: pct(Math.max(0, proyectados - pedidosHoy)),
    record: record ? pct(record.n) : null,
    texto,
    textoRecord,
    superaRecord,
    accesible,
  };
}
