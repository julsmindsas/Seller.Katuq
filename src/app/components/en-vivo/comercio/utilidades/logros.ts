import {
  CifrasEnVivo,
  PedidoEnVivo,
  ProyeccionCierre,
  RecordPedidos,
} from '../../servicios/en-vivo.modelos';
import { diaDeColombia, diaYMes, dinero, dineroCorto, entero, horaCorta } from '../../utilidades/formato';
import { mejorHora } from '../../utilidades/horas';
import { IconoId } from '../../utilidades/iconos';
import { conMayuscula } from './atencion';
import { entregadoHoy } from './tablero';

/**
 * Logros del comercio (diseño 18): la proyección al cierre contra SU récord de los últimos 90
 * días, su mejor hora, lo armado por Opttia y lo entregado. La proyección y el récord los manda el
 * servidor (`radar.proyeccion`, `radar.record`); la mejor hora sale de las cifras por hora que ya
 * trae. Con "ocultar clientes y montos" no sale ningún valor en dinero. Puro.
 */

export interface FilaLogro {
  id: 'record' | 'mejor-hora' | 'opttia' | 'entregados';
  icono: IconoId;
  clase: string;
  /** Texto antes de lo destacado, lo destacado (en negrita) y el texto de después. */
  antes: string;
  destacado: string;
  despues: string;
}

export interface VistaLogros {
  etiqueta: string;
  /** "$3,4 M", "120 pedidos" (con los montos ocultos) o "—" si aún no hay proyección. */
  grande: string;
  detalle: string;
  /** A este ritmo se pasa el récord. */
  superaRecord: boolean;
  filas: FilaLogro[];
}

export interface EntradaLogros {
  proyeccion: ProyeccionCierre | null | undefined;
  /** null para un vendedor con D-349 o si el comercio aún no tiene récord. */
  record: RecordPedidos | null | undefined;
  cifras: CifrasEnVivo | null | undefined;
  pedidos: ReadonlyArray<PedidoEnVivo>;
  ocultar: boolean;
  /** Katuq mirando a un comercio: el texto habla en tercera persona. */
  soloLectura: boolean;
  /** D-349: el vendedor ve solo lo suyo. */
  soloPropias: boolean;
}

/** Lo vendido hoy con Opttia: lo que mande el servidor y, si no manda nada, los pedidos de hoy marcados `ia`. */
export function opttiaDeHoy(
  cifras: CifrasEnVivo | null | undefined,
  pedidos: ReadonlyArray<PedidoEnVivo>
): { pedidos: number; ventas: number } {
  if (cifras?.conOpttia) return cifras.conOpttia;
  const dia = cifras?.dia ?? null;
  let cuantos = 0;
  let ventas = 0;
  for (const p of pedidos) {
    if (!p.ia || p.cancelado) continue;
    if (dia !== null && !(typeof p.tC === 'number' && diaDeColombia(p.tC) === dia)) continue;
    cuantos += 1;
    ventas += p.monto > 0 ? p.monto : 0;
  }
  return { pedidos: cuantos, ventas };
}

/** Pedidos entregados hoy (la misma cuenta de la columna "Entregados hoy" del tablero). */
export function contarEntregadosHoy(pedidos: ReadonlyArray<PedidoEnVivo>, dia: string | null): number {
  return pedidos.filter((p) => p.etapa === 'entregado' && entregadoHoy(p, dia)).length;
}

function unidad(n: number, singular: string, plural: string): string {
  return `${entero(n)} ${Math.round(n) === 1 ? singular : plural}`;
}

export function armarLogros(entrada: EntradaLogros): VistaLogros {
  const { proyeccion, record, cifras, pedidos, ocultar, soloLectura, soloPropias } = entrada;
  const tercera = soloLectura;

  // ── Proyección contra el récord ──
  const proyectados = proyeccion ? Math.max(0, Math.round(proyeccion.pedidos)) : 0;
  const superaRecord = !!proyeccion && !!record && proyeccion.pedidos > record.n;
  let grande = '—';
  let detalle = 'Todavía no hay con qué proyectar el cierre.';
  if (proyeccion) {
    grande = ocultar ? unidad(proyectados, 'pedido', 'pedidos') : dineroCorto(proyeccion.ventas);
    const faltan = record ? Math.max(0, Math.round(record.n - proyeccion.pedidos)) : 0;
    const partes = [
      ocultar ? '' : `≈ ${unidad(proyectados, 'pedido', 'pedidos')}`,
      record ? (superaRecord ? '¡pinta récord!' : `${faltan === 1 ? 'faltaría' : 'faltarían'} ${entero(faltan)} para el récord`) : '',
    ].filter(Boolean);
    detalle = conMayuscula(partes.join(' · '));
  }

  // ── Filas ──
  const filas: FilaLogro[] = [];
  if (record) {
    filas.push({
      id: 'record',
      icono: 'trofeo',
      clase: 't-warn',
      antes: `${tercera ? 'Su' : 'Tu'} récord: `,
      destacado: unidad(record.n, 'pedido', 'pedidos'),
      despues: ` en un día, el ${diaYMes(record.fecha)}`,
    });
  }

  const mejor = cifras ? mejorHora(cifras.porHora, ocultar ? 'pedidos' : 'ventas') : null;
  filas.push({
    id: 'mejor-hora',
    icono: 'rayo',
    clase: 't-accent',
    antes: 'Mejor hora de hoy: ',
    destacado: mejor ? horaCorta(mejor.hora) : '—',
    despues: mejor ? ` · ${unidad(mejor.pedidos, 'pedido', 'pedidos')}` : '',
  });

  const ia = opttiaDeHoy(cifras, pedidos);
  filas.push({
    id: 'opttia',
    icono: 'ia',
    clase: 't-pack',
    antes: `Opttia ${tercera ? 'le' : 'te'} armó `,
    destacado: unidad(ia.pedidos, 'pedido', 'pedidos'),
    despues: ocultar || ia.pedidos === 0 ? ' por WhatsApp' : ` por WhatsApp · ${dinero(ia.ventas)}`,
  });

  const entregados = contarEntregadosHoy(pedidos, cifras?.dia ?? null);
  filas.push({
    id: 'entregados',
    icono: 'check',
    clase: 't-ok',
    antes: soloPropias ? 'Mis pedidos entregados hoy: ' : 'Entregados hoy: ',
    destacado: entero(entregados),
    despues: ` de ${unidad(cifras?.pedidos ?? 0, 'pedido', 'pedidos')}`,
  });

  return {
    etiqueta: `Si el ritmo sigue, hoy ${tercera ? 'cierra' : 'cierras'} en`,
    grande,
    detalle,
    superaRecord,
    filas,
  };
}
