import {
  ETAPAS_CON_HORA,
  EstadoEnVivo,
  EtapaId,
  EventoEnVivo,
  PedidoEnVivo,
} from '../servicios/en-vivo.modelos';
import { diaDeColombia } from '../servicios/en-vivo-reglas';
import { armarCronograma, PasoCrudo } from './cronograma';
import { PlanRepeticion } from './repeticion.tipos';

/**
 * Plan de "Repetir el día" para UN comercio (D-386, tarea 5.7). De la foto toma los pedidos de hoy
 * (`foto.pedidos`) y de cada uno saca:
 *  - su LLEGADA, con `horas.recibido` (si no, la fecha de creación) como hora real;
 *  - sus cambios de etapa CON hora registrada (`horas.<etapa>`), cada uno en su hora;
 *  - un último cambio SIN hora (si el pedido está hoy en una etapa a la que no se le vio la hora,
 *    como `listo` sin `horas.listo`, o `rechazado`/`cancelado`): va al final, ya en su etapa actual.
 * Todo con el mismo contrato de eventos que los reales, con id `rep-…`. Puro.
 */

/** Orden de las etapas del recorrido normal (las que llevan hora, de la primera a la última). */
const RECORRIDO: ReadonlyArray<EtapaId> = ETAPAS_CON_HORA;

function rango(etapa: EtapaId): number {
  return RECORRIDO.indexOf(etapa);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Hora real de la llegada del pedido: cuando se vio "recibido" o, si no, cuando se creó. */
export function llegadaDe(pedido: PedidoEnVivo): number | null {
  const recibido = pedido.horas?.recibido;
  if (typeof recibido === 'number' && Number.isFinite(recibido)) return recibido;
  return typeof pedido.tC === 'number' && Number.isFinite(pedido.tC) ? pedido.tC : null;
}

/** Lo que el evento copia del pedido (igual que `publicarEvento` del servidor). */
function datosDelPedido(pedido: PedidoEnVivo): {
  pedidoId: string;
  numero: string | null;
  cliente: string | null;
  ciudad: string | null;
  barrio: string | null;
  canal: string;
  monto: number;
  dane?: string | null;
  ia: boolean;
} {
  return {
    pedidoId: pedido.id,
    numero: pedido.numero,
    cliente: pedido.cliente,
    ciudad: pedido.ciudad,
    barrio: pedido.barrio,
    canal: pedido.canal,
    monto: pedido.monto,
    dane: pedido.dane,
    ia: pedido.ia,
  };
}

/** El evento que lleva a un pedido a `etapa` (el mismo tipo que usaría el servidor). */
function eventoDeEtapa(pedido: PedidoEnVivo, etapa: EtapaId, anterior: EtapaId, hora: string, sufijo: string): EventoEnVivo {
  const base = { ...datosDelPedido(pedido), id: `rep-${pedido.id}-${sufijo}`, hora, etapa };
  switch (etapa) {
    case 'camino':
      return { ...base, tipo: 'salida', transportador: pedido.transportador, tipoTransportador: pedido.tipoTransportador ?? null };
    case 'entregado':
      return { ...base, tipo: 'entregado' };
    case 'rechazado':
      return { ...base, tipo: 'rechazado' };
    case 'cancelado':
      return { ...base, tipo: 'cancelado' };
    default:
      return {
        ...base,
        tipo: 'cambio_estado',
        estadoAnterior: null,
        estadoNuevo: pedido.estadoProceso,
        etapaAnterior: anterior,
        etapaNueva: etapa,
      };
  }
}

/** Los pasos (sin momento todavía) de un pedido: llegada, cambios con hora y, si falta, el cambio final sin hora. */
export function pasosDeUnPedido(pedido: PedidoEnVivo, llegada: number | null): PasoCrudo[] {
  const pasos: PasoCrudo[] = [];
  const hora = llegada !== null ? iso(llegada) : '';
  pasos.push({
    realMs: llegada,
    evento: {
      ...datosDelPedido(pedido),
      id: `rep-${pedido.id}-nuevo`,
      tipo: 'pedido_nuevo',
      hora,
      etapa: 'recibido',
      estado: pedido.estadoProceso,
    },
  });

  const actual = rango(pedido.etapa);
  const sale = pedido.etapa === 'rechazado' || pedido.etapa === 'cancelado';
  let ultimaEtapa: EtapaId = 'recibido';
  let ultimaHora = llegada;

  for (const etapa of RECORRIDO) {
    if (etapa === 'recibido') continue;
    const ms = pedido.horas?.[etapa];
    if (typeof ms !== 'number' || !Number.isFinite(ms)) continue;
    // Una etapa por delante de donde está hoy el pedido no cuenta (dato raro): no se inventa.
    if (!sale && rango(etapa) > actual) continue;
    // La hora de un cambio nunca va antes de la anterior del mismo pedido.
    const cuando = ultimaHora !== null ? Math.max(ms, ultimaHora) : ms;
    pasos.push({ realMs: cuando, evento: eventoDeEtapa(pedido, etapa, ultimaEtapa, iso(cuando), etapa) });
    ultimaEtapa = etapa;
    ultimaHora = cuando;
  }

  // Si hoy está en otra etapa, ese cambio no tiene hora: se muestra al final.
  if (pedido.etapa !== ultimaEtapa) {
    pasos.push({ realMs: null, evento: eventoDeEtapa(pedido, pedido.etapa, ultimaEtapa, '', 'final') });
  }
  return pasos;
}

/** Pedidos de hoy de la foto, por la hora de su llegada (un pedido sin ninguna hora no se puede ubicar en el día y no se repite). */
export function pedidosDeHoy(estado: EstadoEnVivo, dia: string): PedidoEnVivo[] {
  return estado.pedidos.filter((p) => {
    const llegada = llegadaDe(p);
    return llegada !== null && diaDeColombia(llegada) === dia;
  });
}

/**
 * Arma el plan del comercio con el estado real y la hora de ahora. Devuelve null si hoy no hubo
 * llegadas (no hay nada que repetir).
 */
export function armarPlanComercio(estado: EstadoEnVivo, ahoraMs: number): PlanRepeticion | null {
  const dia = estado.cifras?.dia || diaDeColombia(ahoraMs);
  const pedidos = pedidosDeHoy(estado, dia);
  if (pedidos.length === 0) return null;

  const crudos: PasoCrudo[] = [];
  for (const pedido of pedidos) {
    for (const paso of pasosDeUnPedido(pedido, llegadaDe(pedido))) crudos.push(paso);
  }
  const plan = armarCronograma(crudos, { vista: 'comercio', ahoraMs, llegadas: pedidos.length });
  if (!plan) return null;
  // Los cambios al final llevan la hora del cierre de la repetición (el reloj ya está en "ahora").
  const fin = new Date(plan.finMs).toISOString();
  return {
    ...plan,
    pasos: plan.pasos.map((p) => (p.alFinal ? { ...p, evento: { ...p.evento, hora: fin } } : p)),
  };
}
