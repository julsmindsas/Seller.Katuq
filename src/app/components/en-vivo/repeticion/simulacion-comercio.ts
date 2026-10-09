import { aplicarEvento } from '../servicios/en-vivo-reductores';
import { claveDeTexto } from '../servicios/en-vivo-reglas';
import {
  CifraPorCanal,
  CifrasEnVivo,
  ConteoPorEtapa,
  EstadoEnVivo,
  EtapaId,
  HorasPorEtapa,
  PedidoEnVivo,
  ResumenDia,
  ETAPAS_CON_HORA,
} from '../servicios/en-vivo.modelos';
import { horaDeColombia } from '../utilidades/formato';
import { acumularFilas } from './acumulados';
import { llegadaDe } from './plan-comercio';
import { PasoRepeticion, Simulador } from './repeticion.tipos';

/**
 * Simulador del comercio (D-386, tarea 5.7): arranca a cero y va sumando los eventos simulados con
 * el MISMO reductor que los reales (`aplicarEvento`). Con eso arma el estado que se pinta en cada
 * instante: pedidos (con lo que el evento no trae, tomado de la foto), flota, y las cifras del día
 * (ventas, pedidos, ticket, por hora, por canal, por etapa) recalculadas SOLO desde los pedidos
 * simulados; "ayer a esta hora" sale de las filas por hora de ayer que ya mandó el servidor.
 *
 * Es una simulación, no una cifra del servidor: existe únicamente mientras corre la repetición y
 * se descarta al terminar (la pantalla vuelve al estado real).
 */

const ETAPAS: ReadonlyArray<EtapaId> = ['recibido', 'produccion', 'producido', 'empacado', 'listo', 'camino', 'entregado', 'rechazado', 'cancelado'];

function conteoVacio(): ConteoPorEtapa {
  const conteo = {} as ConteoPorEtapa;
  for (const etapa of ETAPAS) conteo[etapa] = 0;
  return conteo;
}

/** Ayer a esta hora: lo que sumaban las filas por hora de ayer hasta el instante simulado. */
export function ayerHastaElInstante(filas: CifrasEnVivo['porHora'], instanteMs: number, ahoraMs: number): ResumenDia {
  const ventas = Math.round(acumularFilas(filas, (f) => f.ventasAyer, instanteMs, ahoraMs, true));
  const pedidos = Math.round(acumularFilas(filas, (f) => f.pedidosAyer, instanteMs, ahoraMs, true));
  return { ventas, pedidos, ticketPromedio: pedidos > 0 ? Math.round(ventas / pedidos) : 0 };
}

/**
 * Pedido simulado completado con lo que el evento no trae (estado de pago, fechas, transportador,
 * dane) y SIN las horas que el servidor nunca registró: un cambio mostrado al final no inventa hora.
 */
export function completarPedido(simulado: PedidoEnVivo, real: PedidoEnVivo): PedidoEnVivo {
  const horas: HorasPorEtapa = {};
  for (const etapa of ETAPAS_CON_HORA) {
    const registrada = real.horas?.[etapa];
    const vista = simulado.horas[etapa];
    if (typeof registrada === 'number' && typeof vista === 'number') horas[etapa] = vista;
  }
  const llevaTransportador = simulado.etapa === 'camino' || simulado.etapa === 'entregado';
  return {
    ...simulado,
    estadoPago: real.estadoPago,
    creado: real.creado,
    tC: real.tC,
    dane: real.dane ?? simulado.dane,
    horas,
    tL: horas.listo ?? null,
    tS: horas.camino ?? null,
    tE: horas.entregado ?? null,
    transportador: simulado.transportador ?? (llevaTransportador ? real.transportador : null),
    tipoTransportador: simulado.tipoTransportador ?? (llevaTransportador ? real.tipoTransportador : undefined),
  };
}

/** Las cifras del día calculadas desde los pedidos simulados (hasta el instante simulado). */
export function cifrasDesdePedidos(
  real: CifrasEnVivo,
  pedidos: ReadonlyArray<PedidoEnVivo>,
  llegadas: ReadonlyMap<string, number>,
  instanteMs: number,
  ahoraMs: number
): CifrasEnVivo {
  const porHora = real.porHora.map((fila) => ({ ...fila, ventas: 0, pedidos: 0 }));
  const indiceDeHora = new Map<number, number>();
  porHora.forEach((fila, i) => indiceDeHora.set(fila.hora, i));
  const porCanal = new Map<string, CifraPorCanal>();
  const porEtapa = conteoVacio();
  let ventas = 0;
  let cuantos = 0;
  let iaPedidos = 0;
  let iaVentas = 0;

  for (const pedido of pedidos) {
    porEtapa[pedido.etapa] += 1;
    if (pedido.cancelado) continue;
    cuantos += 1;
    ventas += pedido.monto;
    if (pedido.ia) {
      iaPedidos += 1;
      iaVentas += pedido.monto;
    }
    const canal = porCanal.get(pedido.canal) ?? { canal: pedido.canal, pedidos: 0, ventas: 0 };
    canal.pedidos += 1;
    canal.ventas += pedido.monto;
    porCanal.set(pedido.canal, canal);
    const llegada = llegadas.get(pedido.id);
    const i = llegada === undefined ? undefined : indiceDeHora.get(horaDeColombia(llegada));
    if (i !== undefined) {
      porHora[i].pedidos += 1;
      porHora[i].ventas += pedido.monto;
    }
  }

  return {
    ...real,
    ventas,
    pedidos: cuantos,
    ticketPromedio: cuantos > 0 ? Math.round(ventas / cuantos) : 0,
    ayerMismaHora: ayerHastaElInstante(real.porHora, instanteMs, ahoraMs),
    porHora,
    porCanal: Array.from(porCanal.values()).sort((a, b) => b.ventas - a.ventas),
    porEtapa,
    // Los productos más vendidos no se pueden rearmar sin las líneas de cada pedido: la repetición empieza sin ellos.
    productosEstrella: [],
    conOpttia: real.conOpttia ? { pedidos: iaPedidos, ventas: iaVentas } : undefined,
  };
}

export class SimuladorComercio implements Simulador {
  private crudo: EstadoEnVivo;
  private readonly reales = new Map<string, PedidoEnVivo>();
  private readonly llegadas = new Map<string, number>();
  private cache: PedidoEnVivo[] | null = null;

  /**
   * @param real el estado real al empezar (la foto): de ahí salen los datos que el evento no trae
   * @param ahoraMs "ahora" (real): la hora en curso de las cifras por hora se completa aquí
   */
  constructor(private readonly real: EstadoEnVivo, pedidosDeHoy: ReadonlyArray<PedidoEnVivo>, private readonly ahoraMs: number) {
    for (const pedido of pedidosDeHoy) {
      this.reales.set(pedido.id, pedido);
      const llegada = llegadaDe(pedido);
      if (llegada !== null) this.llegadas.set(pedido.id, llegada);
    }
    this.crudo = {
      ...real,
      pedidos: [],
      eventos: [],
      // Sin marca de foto: nada que la detecte como "foto nueva" al entrar ni al salir del sustituto.
      actualizadoEn: null,
      // El radar queda como estaba (las piezas de radar se congelan solas); sin productos, que no se pueden rearmar.
      radar: real.radar ? { ...real.radar, productosEstrella: [] } : null,
    };
  }

  aplicar(paso: PasoRepeticion): void {
    this.crudo = aplicarEvento(this.crudo, paso.evento).estado;
    this.cache = null;
  }

  pedidos(): ReadonlyArray<PedidoEnVivo> {
    if (this.cache) return this.cache;
    const completos = this.crudo.pedidos.map((p) => {
      const real = this.reales.get(p.id);
      return real ? completarPedido(p, real) : p;
    });
    // Del más nuevo al más viejo, como la foto.
    this.cache = completos.sort((a, b) => (b.tC ?? 0) - (a.tC ?? 0));
    return this.cache;
  }

  estadoEn(instanteMs: number): EstadoEnVivo {
    const pedidos = this.pedidos();
    const enCamino = new Set<string>();
    for (const pedido of pedidos) {
      if (pedido.etapa === 'camino' && pedido.transportador) enCamino.add(claveDeTexto(pedido.transportador));
    }
    return {
      ...this.crudo,
      pedidos: pedidos as PedidoEnVivo[],
      flota: this.real.flota.map((m) => ({ ...m, enRuta: enCamino.has(claveDeTexto(m.nombre)) })),
      cifras: this.real.cifras
        ? cifrasDesdePedidos(this.real.cifras, pedidos, this.llegadas, instanteMs, this.ahoraMs)
        : null,
    };
  }
}
