import { aplicarEvento } from '../servicios/en-vivo-reductores';
import {
  CifrasGlobalEnVivo,
  ComercioEnVivo,
  ConteoPorEtapa,
  EstadoEnVivo,
  EtapaId,
  EventoEnVivo,
  MejorHora,
  PedidoEnVivo,
} from '../servicios/en-vivo.modelos';
import { horaDeColombia } from '../utilidades/formato';
import { acumular, acumularFilas, fraccionDeHora } from './acumulados';
import { inicioDeHora } from './cronograma';
import { PasoRepeticion, Simulador } from './repeticion.tipos';
import { ayerHastaElInstante } from './simulacion-comercio';

/**
 * Simulador de toda Katuq (D-386, tarea 5.7). Las cifras de la plataforma salen de las filas por
 * hora que ya mandó el servidor (global y por comercio): en el instante T cuentan las horas
 * completas y la parte de la hora en curso. Lo que el servidor no manda por hora (conteos por
 * etapa, ciudades, canales, despachos...) se escala con la parte del día vendida hasta T, de modo
 * que al llegar a "ahora" quedan exactamente en las cifras reales. Los eventos de hoy que trae la
 * foto llenan la lista, el muro y las escenas en su hora real. Existe solo mientras corre la
 * repetición.
 */

const ETAPAS: ReadonlyArray<EtapaId> = ['recibido', 'produccion', 'alistamiento', 'listo', 'camino', 'entregado', 'rechazado', 'cancelado'];

/** Escala un conteo por la parte del día que ya pasó. */
function escalar(valor: number, razon: number): number {
  return Math.round((valor || 0) * razon);
}

function escalarEtapas(conteo: ConteoPorEtapa | undefined, razon: number): ConteoPorEtapa {
  const resultado = {} as ConteoPorEtapa;
  for (const etapa of ETAPAS) resultado[etapa] = escalar(conteo?.[etapa] ?? 0, razon);
  return resultado;
}

function sumar(serie: ReadonlyArray<number>): number {
  let total = 0;
  for (const v of serie) total += v || 0;
  return total;
}

function empresaDe(evento: EventoEnVivo): string | null {
  return evento.empresa ?? evento.comercio?.empresa ?? null;
}

/** Un comercio en el instante T: cuánto lleva vendido y cuántos pedidos le tocan de los que tiene hoy. */
function comercioEn(c: ComercioEnVivo, eventos: ReadonlyArray<EventoEnVivo>, instanteMs: number, ahoraMs: number): ComercioEnVivo {
  const serie = c.porHora?.ventas ?? [];
  const acumulado = acumular(serie, instanteMs, ahoraMs);
  const total = sumar(serie);
  const razon = total > 0 ? acumulado / total : 0;
  const ayerAcumulado = acumular(c.porHora?.ventasAyer ?? [], instanteMs, ahoraMs, true);
  const ayerReal = c.ayerMismaHora?.ventas ?? 0;
  const ultimo = eventos.find((e) => empresaDe(e) === c.empresa);
  return {
    ...c,
    n: acumulado > 0 ? Math.max(1, escalar(c.n, razon)) : 0,
    ventas: Math.round(acumulado),
    ayerMismaHora: {
      ventas: Math.round(ayerAcumulado),
      pedidos: ayerReal > 0 ? Math.round((c.ayerMismaHora?.pedidos ?? 0) * (ayerAcumulado / ayerReal)) : 0,
    },
    etapas: escalarEtapas(c.etapas, razon),
    porHora: {
      ventas: serie.map((v, k) => Math.round((v || 0) * fraccionDeHora(k, instanteMs, ahoraMs))),
      ventasAyer: c.porHora?.ventasAyer ?? [],
    },
    ultimoEvento: ultimo ? { tipo: ultimo.tipo, numero: ultimo.numero, hora: ultimo.hora } : null,
  };
}

/** Las cifras de toda Katuq en el instante T de la repetición (ver la cabecera del archivo). */
export function cifrasGlobalEn(
  g: CifrasGlobalEnVivo,
  eventos: ReadonlyArray<EventoEnVivo>,
  instanteMs: number,
  ahoraMs: number
): CifrasGlobalEnVivo {
  const filas = g.porHora ?? [];
  const pedidos = Math.round(acumularFilas(filas, (f) => f.pedidos, instanteMs, ahoraMs));
  const ventas = Math.round(acumularFilas(filas, (f) => f.ventas, instanteMs, ahoraMs));
  const totalPedidos = filas.reduce((s, f) => s + (f.pedidos || 0), 0);
  const totalVentas = filas.reduce((s, f) => s + (f.ventas || 0), 0);
  const razonPedidos = totalPedidos > 0 ? pedidos / totalPedidos : 0;
  const razonVentas = totalVentas > 0 ? ventas / totalVentas : 0;

  const porHora = filas.map((f) => {
    const parte = fraccionDeHora(f.hora, instanteMs, ahoraMs);
    return { ...f, ventas: Math.round(f.ventas * parte), pedidos: Math.round(f.pedidos * parte) };
  });

  // Pedidos por minuto: lo que llevaba esa hora entre los minutos que la hora lleva transcurridos (o dura).
  const hora = horaDeColombia(instanteMs);
  const filaHora = filas.find((f) => f.hora === hora);
  const minutosDeLaHora =
    horaDeColombia(ahoraMs) === hora ? Math.max(1, (ahoraMs - inicioDeHora(ahoraMs)) / 60000) : 60;
  const pedidosPorMinuto = filaHora && filaHora.pedidos > 0 ? filaHora.pedidos / minutosDeLaHora : 0;

  const comercios = (g.comercios ?? [])
    .map((c) => comercioEn(c, eventos, instanteMs, ahoraMs))
    .sort((a, b) => b.ventas - a.ventas);

  let mejor: MejorHora | null = null;
  for (const f of porHora) {
    if (f.ventas > 0 && (mejor === null || f.ventas > mejor.ventas)) mejor = { hora: f.hora, ventas: f.ventas, pedidos: f.pedidos };
  }

  const record = g.ritmoRecord;
  const recordMs = record ? Date.parse(record.hora) : NaN;

  return {
    ...g,
    ventas,
    pedidos,
    ticketPromedio: pedidos > 0 ? Math.round(ventas / pedidos) : 0,
    ayerMismaHora: ayerHastaElInstante(filas, instanteMs, ahoraMs),
    porHora,
    porCanal: (g.porCanal ?? []).map((c) => ({ ...c, pedidos: escalar(c.pedidos, razonPedidos), ventas: escalar(c.ventas, razonVentas) })),
    porEtapa: escalarEtapas(g.porEtapa, razonPedidos),
    comerciosHoy: comercios.filter((c) => c.n > 0).length,
    comerciosUltimaHora: (g.comercios ?? []).filter((c) => (c.porHora?.ventas?.[hora] ?? 0) * fraccionDeHora(hora, instanteMs, ahoraMs) > 0).length,
    pedidosPorMinuto,
    // El récord de ritmo aparece cuando la repetición pasa por la ventana donde ocurrió.
    ritmoRecord: record && Number.isFinite(recordMs) && recordMs <= instanteMs ? record : null,
    mejorHora: mejor,
    enCamino: escalar(g.enCamino, razonPedidos),
    despachosHoy: escalar(g.despachosHoy, razonPedidos),
    entregadosHoy: escalar(g.entregadosHoy, razonPedidos),
    ciudadesEntregadas: escalar(g.ciudadesEntregadas, razonPedidos),
    opttia: g.opttia
      ? { pedidos: escalar(g.opttia.pedidos, razonPedidos), ventas: escalar(g.opttia.ventas, razonVentas) }
      : g.opttia,
    comercios,
    ciudades: (g.ciudades ?? []).map((c) => ({ ...c, pedidos: escalar(c.pedidos, razonPedidos), ventas: escalar(c.ventas, razonVentas) })),
    departamentos: (g.departamentos ?? []).map((d) => ({ ...d, pedidos: escalar(d.pedidos, razonPedidos), ventas: escalar(d.ventas, razonVentas) })),
  };
}

export class SimuladorKatuq implements Simulador {
  private crudo: EstadoEnVivo;

  constructor(private readonly real: EstadoEnVivo, private readonly ahoraMs: number) {
    this.crudo = {
      ...real,
      eventos: [],
      actualizadoEn: null,
      radar: real.radar ? { ...real.radar, productosEstrella: [] } : null,
    };
  }

  aplicar(paso: PasoRepeticion): void {
    this.crudo = aplicarEvento(this.crudo, paso.evento).estado;
  }

  pedidos(): ReadonlyArray<PedidoEnVivo> {
    return [];
  }

  estadoEn(instanteMs: number): EstadoEnVivo {
    const g = this.real.cifrasGlobal;
    return {
      ...this.crudo,
      cifrasGlobal: g ? cifrasGlobalEn(g, this.crudo.eventos, instanteMs, this.ahoraMs) : null,
    };
  }
}
