import {
  CifraPorHora,
  CifrasEnVivo,
  CifrasGlobalEnVivo,
  EstadoEnVivo,
  EtapaId,
  MensajeroEnVivo,
  PedidoEnVivo,
  ProyeccionCierre,
  RadarEnVivo,
  RecordPedidos,
  ResumenDia,
} from '../servicios/en-vivo.modelos';
import { decimal, diaDeColombia, dinero, FormatoCifra, variacionPct } from './formato';
import { IconoId } from './iconos';
import { TonoVisual } from './tonos';

/**
 * Armado de lo que pintan las cifras del tablero a partir de lo que manda el SERVIDOR.
 * Aquí no se suman ventas ni pedidos: solo se eligen, se rotulan y se ordenan las cifras
 * que ya vienen calculadas (`cifras`, `radar`). Todo puro.
 *
 * Única excepción documentada: "entregados hoy" del comercio, que el servidor aún no manda
 * (`cifras.porEtapa.entregado` cuenta toda la ventana de 7 días); se cuenta de los pedidos
 * que ya vienen en la foto. Si el servidor agrega `entregadosHoy`, se cambia aquí.
 */

/**
 * Llave de una lista que se abre al tocar una cifra, una etapa, un canal o una ciudad:
 * `todos` · `prep` · `etapa:<id>` · `canal:<canal>` · `ciudad:<ciudad>` · `ia`.
 */
export type ClaveLista = string;

export interface TarjetaCifra {
  id: string;
  etiqueta: string;
  /** Valor final; el conteo animado lo lleva desde el valor anterior. */
  valor: number;
  formato: FormatoCifra;
  tono: TonoVisual | 'tinta';
  icono: IconoId;
  /** Texto secundario ("Ticket promedio $85.000"). */
  sub?: string;
  /** Parte resaltada que va antes del `sub` ("+12 %"). */
  subResaltado?: string;
  subDireccion?: 'sube' | 'baja' | null;
  /** Valor en el color de marca (las ventas). */
  destacada?: boolean;
  /** Si existe, la tarjeta se puede tocar y avisa esta llave. */
  clave?: ClaveLista;
}

// ── Comercio ────────────────────────────────────────────────────────────────

/** Pedidos entregados HOY (por la hora en que se vio la entrega; si no hay, por la de creación). */
export function entregadosDeHoy(pedidos: ReadonlyArray<PedidoEnVivo>, dia: string): number {
  let cuantos = 0;
  for (const pedido of pedidos) {
    if (pedido.etapa !== 'entregado') continue;
    const ms = pedido.horas.entregado ?? pedido.tC;
    if (ms !== null && ms !== undefined && diaDeColombia(ms) === dia) cuantos += 1;
  }
  return cuantos;
}

/** Conteos por etapa para la franja. `entregado` es el de hoy (ver arriba). */
export function conteosDeEtapas(estado: EstadoEnVivo): Partial<Record<EtapaId, number>> {
  if (estado.vista === 'katuq') {
    const g = estado.cifrasGlobal;
    return g ? { ...(g.porEtapa ?? {}), entregado: g.entregadosHoy ?? g.porEtapa?.entregado ?? 0 } : {};
  }
  const c = estado.cifras;
  if (!c) return {};
  return { ...c.porEtapa, entregado: entregadosDeHoy(estado.pedidos, c.dia) };
}

function variacion(actual: number, referencia: number): Pick<TarjetaCifra, 'subResaltado' | 'subDireccion'> {
  const pct = variacionPct(actual, referencia);
  if (pct === null) return { subResaltado: undefined, subDireccion: null };
  return { subResaltado: `${pct >= 0 ? '+' : ''}${pct} %`, subDireccion: pct >= 0 ? 'sube' : 'baja' };
}

export interface OpcionesTarjetas {
  /** "Ocultar clientes y montos": el dinero se vuelve conteos. */
  ocultar: boolean;
  /** D-349: el vendedor ve solo lo suyo y los rótulos dicen "Mis…". */
  soloPropias: boolean;
}

/** Las siete cifras del comercio: ventas, pedidos, en preparación, listos, en camino, entregados y Con Opttia. */
export function tarjetasComercio(
  cifras: CifrasEnVivo,
  conteos: Partial<Record<EtapaId, number>>,
  flota: ReadonlyArray<MensajeroEnVivo>,
  opciones: OpcionesTarjetas
): TarjetaCifra[] {
  const { ocultar, soloPropias } = opciones;
  const rotulo = (normal: string, propio: string): string => (soloPropias ? propio : normal);
  const enPreparacion = (conteos.recibido ?? 0) + (conteos.produccion ?? 0) + (conteos.alistamiento ?? 0);
  const enLaCalle = flota.filter((m) => m.enRuta).length;
  const ayer = cifras.ayerMismaHora;

  const tarjetas: TarjetaCifra[] = [
    ocultar
      ? {
          id: 'ventas',
          etiqueta: rotulo('Ventas de hoy', 'Mis ventas de hoy'),
          valor: cifras.pedidos,
          formato: 'ventas',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          sub: 'Montos ocultos en pantalla',
          clave: 'todos',
        }
      : {
          id: 'ventas',
          etiqueta: rotulo('Ventas de hoy', 'Mis ventas de hoy'),
          valor: cifras.ventas,
          formato: 'dinero',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          ...variacion(cifras.ventas, ayer.ventas),
          sub: 'vs. ayer a esta hora',
          clave: 'todos',
        },
    {
      id: 'pedidos',
      etiqueta: rotulo('Pedidos hoy', 'Mis pedidos hoy'),
      valor: cifras.pedidos,
      formato: 'entero',
      tono: 'tinta',
      icono: 'capas',
      sub: ocultar ? `${ayer.pedidos} ayer a esta hora` : `Ticket promedio ${dinero(cifras.ticketPromedio)}`,
      clave: 'todos',
    },
    {
      id: 'prep',
      etiqueta: rotulo('En preparación', 'Mis pedidos en preparación'),
      valor: enPreparacion,
      formato: 'entero',
      tono: 'aviso',
      icono: 'caja',
      sub: 'Recibidos, producción y alistamiento',
      clave: 'prep',
    },
    {
      id: 'listos',
      etiqueta: rotulo('Listos para salir', 'Mis pedidos listos para salir'),
      valor: conteos.listo ?? 0,
      formato: 'entero',
      tono: 'acento',
      icono: 'tienda',
      sub: (conteos.listo ?? 0) > 0 ? 'Esperando mensajero' : 'Nada esperando',
      clave: 'etapa:listo',
    },
    {
      id: 'camino',
      etiqueta: rotulo('En camino', 'Mis pedidos en camino'),
      valor: conteos.camino ?? 0,
      formato: 'entero',
      tono: 'info',
      icono: 'moto',
      sub: `${enLaCalle} ${enLaCalle === 1 ? 'mensajero' : 'mensajeros'} en la calle`,
      clave: 'etapa:camino',
    },
    {
      id: 'entregados',
      etiqueta: rotulo('Entregados hoy', 'Mis pedidos entregados hoy'),
      valor: conteos.entregado ?? 0,
      formato: 'entero',
      tono: 'ok',
      icono: 'check',
      sub: 'Incluye ventas en tienda',
      clave: 'etapa:entregado',
    },
  ];

  if (cifras.conOpttia) {
    tarjetas.push({
      id: 'opttia',
      etiqueta: 'Con Opttia',
      valor: ocultar ? cifras.conOpttia.pedidos : cifras.conOpttia.ventas,
      formato: ocultar ? 'pedidos' : 'dinero',
      tono: 'pack',
      icono: 'ia',
      sub: `${cifras.conOpttia.pedidos} ${cifras.conOpttia.pedidos === 1 ? 'pedido armado' : 'pedidos armados'} por el bot de WhatsApp`,
      clave: 'ia',
    });
  }
  return tarjetas;
}

// ── Toda Katuq ──────────────────────────────────────────────────────────────

/** Cifras de toda Katuq (las genéricas; la vista de plataforma puede armar las suyas con el mismo componente). */
export function tarjetasKatuq(g: CifrasGlobalEnVivo, opciones: { ocultar: boolean }): TarjetaCifra[] {
  const { ocultar } = opciones;
  const total = g.comercios.length;
  const tarjetas: TarjetaCifra[] = [
    ocultar
      ? {
          id: 'ventas',
          etiqueta: 'Ventas en Katuq hoy',
          valor: g.pedidos,
          formato: 'ventas',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          sub: 'Montos ocultos en pantalla',
        }
      : {
          id: 'ventas',
          etiqueta: 'Ventas en Katuq hoy',
          valor: g.ventas,
          formato: 'dinero',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          ...variacion(g.ventas, g.ayerMismaHora?.ventas ?? 0),
          sub: 'vs. ayer a esta hora',
        },
    {
      id: 'pedidos',
      etiqueta: 'Pedidos hoy',
      valor: g.pedidos,
      formato: 'entero',
      tono: 'tinta',
      icono: 'capas',
      sub: g.ayerMismaHora ? `${g.ayerMismaHora.pedidos} ayer a esta hora` : undefined,
    },
    {
      id: 'comercios',
      etiqueta: 'Comercios vendiendo',
      valor: g.comerciosHoy ?? 0,
      formato: 'entero',
      tono: 'pack',
      icono: 'tienda',
      sub: `${g.comerciosUltimaHora ?? 0} con pedidos en la última hora${total ? ` · de ${total}` : ''}`,
    },
    {
      id: 'ritmo',
      etiqueta: 'Pedidos por minuto',
      valor: g.pedidosPorMinuto ?? 0,
      formato: 'decimal',
      tono: 'aviso',
      icono: 'pulso',
      sub: g.ritmoRecord ? `Récord de hoy ${decimal(g.ritmoRecord.porMinuto)}` : undefined,
    },
    {
      id: 'camino',
      etiqueta: 'En camino',
      valor: g.enCamino ?? g.porEtapa?.camino ?? 0,
      formato: 'entero',
      tono: 'info',
      icono: 'moto',
      sub: `${g.despachosHoy ?? 0} despachos hoy`,
    },
    {
      id: 'entregados',
      etiqueta: 'Entregados hoy',
      valor: g.entregadosHoy ?? 0,
      formato: 'entero',
      tono: 'ok',
      icono: 'check',
      sub: g.ciudadesEntregadas !== undefined ? `En ${g.ciudadesEntregadas} ${g.ciudadesEntregadas === 1 ? 'ciudad' : 'ciudades'}` : undefined,
    },
  ];

  if (g.opttia && g.opttia.pedidos > 0) {
    tarjetas.push({
      id: 'opttia',
      etiqueta: 'Con Opttia',
      valor: ocultar ? g.opttia.pedidos : g.opttia.ventas,
      formato: ocultar ? 'pedidos' : 'dinero',
      tono: 'pack',
      icono: 'ia',
      sub: `${g.opttia.pedidos} ${g.opttia.pedidos === 1 ? 'pedido armado' : 'pedidos armados'} por el bot de WhatsApp`,
    });
  }
  return tarjetas;
}

// ── Héroe ───────────────────────────────────────────────────────────────────

/** Lo que pinta el héroe: odómetro de ventas, proyección contra el récord y mini gráfico por hora. */
export interface DatosHeroe {
  etiqueta: string;
  ventas: number;
  pedidos: number;
  ticketPromedio: number;
  ayerMismaHora: ResumenDia | null;
  porHora: ReadonlyArray<CifraPorHora>;
  proyeccion: ProyeccionCierre | null;
  record: RecordPedidos | null;
}

export function datosHeroeComercio(estado: EstadoEnVivo): DatosHeroe | null {
  const c = estado.cifras;
  if (!c) return null;
  return {
    etiqueta: estado.soloPropias ? 'Mis ventas de hoy' : 'Ventas de hoy',
    ventas: c.ventas,
    pedidos: c.pedidos,
    ticketPromedio: c.ticketPromedio,
    ayerMismaHora: c.ayerMismaHora,
    porHora: c.porHora,
    proyeccion: estado.radar?.proyeccion ?? null,
    record: estado.radar?.record ?? null,
  };
}

export function datosHeroeKatuq(g: CifrasGlobalEnVivo | null, radar: RadarEnVivo | null): DatosHeroe | null {
  if (!g) return null;
  return {
    etiqueta: 'Ventas en Katuq hoy',
    ventas: g.ventas,
    pedidos: g.pedidos,
    ticketPromedio: g.ticketPromedio,
    ayerMismaHora: g.ayerMismaHora ?? null,
    porHora: g.porHora ?? [],
    proyeccion: radar?.proyeccion ?? null,
    record: radar?.record ?? null,
  };
}
