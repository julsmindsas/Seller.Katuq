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
import { Traductor } from './traductor';

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

/** Las siete cifras del comercio: ventas, pedidos, en preparación, para despachar, despachados, entregados y Con Opttia. */
export function tarjetasComercio(
  cifras: CifrasEnVivo,
  conteos: Partial<Record<EtapaId, number>>,
  flota: ReadonlyArray<MensajeroEnVivo>,
  opciones: OpcionesTarjetas,
  t: Traductor
): TarjetaCifra[] {
  const { ocultar, soloPropias } = opciones;
  const rotulo = (normal: string, propio: string): string => t(soloPropias ? propio : normal);
  const enPreparacion = (conteos.recibido ?? 0) + (conteos.produccion ?? 0) + (conteos.producido ?? 0) + (conteos.empacado ?? 0);
  const enLaCalle = flota.filter((m) => m.enRuta).length;
  const ayer = cifras.ayerMismaHora;

  const tarjetas: TarjetaCifra[] = [
    ocultar
      ? {
          id: 'ventas',
          etiqueta: rotulo('enVivo.tarjetas.ventasHoy', 'enVivo.tarjetas.misVentasHoy'),
          valor: cifras.pedidos,
          formato: 'ventas',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          sub: t('enVivo.tarjetas.montosOcultos'),
          clave: 'todos',
        }
      : {
          id: 'ventas',
          etiqueta: rotulo('enVivo.tarjetas.ventasHoy', 'enVivo.tarjetas.misVentasHoy'),
          valor: cifras.ventas,
          formato: 'dinero',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          ...variacion(cifras.ventas, ayer.ventas),
          sub: t('enVivo.tarjetas.vsAyer'),
          clave: 'todos',
        },
    {
      id: 'pedidos',
      etiqueta: rotulo('enVivo.tarjetas.pedidosHoy', 'enVivo.tarjetas.misPedidosHoy'),
      valor: cifras.pedidos,
      formato: 'entero',
      tono: 'tinta',
      icono: 'capas',
      sub: ocultar
        ? t('enVivo.tarjetas.pedidosAyerHora', { n: ayer.pedidos })
        : t('enVivo.tarjetas.ticketPromedio', { valor: dinero(cifras.ticketPromedio) }),
      clave: 'todos',
    },
    {
      id: 'prep',
      etiqueta: rotulo('enVivo.tarjetas.enPreparacion', 'enVivo.tarjetas.misEnPreparacion'),
      valor: enPreparacion,
      formato: 'entero',
      tono: 'aviso',
      icono: 'caja',
      sub: t('enVivo.tarjetas.preparacionDetalle'),
      clave: 'prep',
    },
    {
      id: 'listos',
      etiqueta: rotulo('enVivo.tarjetas.paraDespachar', 'enVivo.tarjetas.misParaDespachar'),
      valor: conteos.listo ?? 0,
      formato: 'entero',
      tono: 'acento',
      icono: 'tienda',
      sub: t((conteos.listo ?? 0) > 0 ? 'enVivo.tarjetas.esperandoMensajero' : 'enVivo.tarjetas.nadaEsperando'),
      clave: 'etapa:listo',
    },
    {
      id: 'camino',
      etiqueta: rotulo('enVivo.tarjetas.despachados', 'enVivo.tarjetas.misDespachados'),
      valor: conteos.camino ?? 0,
      formato: 'entero',
      tono: 'info',
      icono: 'moto',
      sub: t(enLaCalle === 1 ? 'enVivo.tarjetas.mensajeroEnCalle' : 'enVivo.tarjetas.mensajerosEnCalle', { n: enLaCalle }),
      clave: 'etapa:camino',
    },
    {
      id: 'entregados',
      etiqueta: rotulo('enVivo.tarjetas.entregadosHoy', 'enVivo.tarjetas.misEntregadosHoy'),
      valor: conteos.entregado ?? 0,
      formato: 'entero',
      tono: 'ok',
      icono: 'check',
      sub: t('enVivo.tarjetas.incluyeTienda'),
      clave: 'etapa:entregado',
    },
  ];

  if (cifras.conOpttia) {
    tarjetas.push({
      id: 'opttia',
      etiqueta: t('enVivo.tarjetas.conOpttia'),
      valor: ocultar ? cifras.conOpttia.pedidos : cifras.conOpttia.ventas,
      formato: ocultar ? 'pedidos' : 'dinero',
      tono: 'pack',
      icono: 'ia',
      sub: t(cifras.conOpttia.pedidos === 1 ? 'enVivo.tarjetas.pedidoArmado' : 'enVivo.tarjetas.pedidosArmados', { n: cifras.conOpttia.pedidos }),
      clave: 'ia',
    });
  }
  return tarjetas;
}

// ── Toda Katuq ──────────────────────────────────────────────────────────────

/** Cifras de toda Katuq (las genéricas; la vista de plataforma puede armar las suyas con el mismo componente). */
export function tarjetasKatuq(g: CifrasGlobalEnVivo, opciones: { ocultar: boolean }, t: Traductor): TarjetaCifra[] {
  const { ocultar } = opciones;
  const total = g.comercios.length;
  const tarjetas: TarjetaCifra[] = [
    ocultar
      ? {
          id: 'ventas',
          etiqueta: t('enVivo.tarjetas.ventasKatuqHoy'),
          valor: g.pedidos,
          formato: 'ventas',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          sub: t('enVivo.tarjetas.montosOcultos'),
        }
      : {
          id: 'ventas',
          etiqueta: t('enVivo.tarjetas.ventasKatuqHoy'),
          valor: g.ventas,
          formato: 'dinero',
          tono: 'acento',
          icono: 'bolsa',
          destacada: true,
          ...variacion(g.ventas, g.ayerMismaHora?.ventas ?? 0),
          sub: t('enVivo.tarjetas.vsAyer'),
        },
    {
      id: 'pedidos',
      etiqueta: t('enVivo.tarjetas.pedidosHoy'),
      valor: g.pedidos,
      formato: 'entero',
      tono: 'tinta',
      icono: 'capas',
      sub: g.ayerMismaHora ? t('enVivo.tarjetas.pedidosAyerHora', { n: g.ayerMismaHora.pedidos }) : undefined,
    },
    {
      id: 'comercios',
      etiqueta: t('enVivo.tarjetas.comerciosVendiendo'),
      valor: g.comerciosHoy ?? 0,
      formato: 'entero',
      tono: 'pack',
      icono: 'tienda',
      sub: total
        ? t('enVivo.tarjetas.comerciosUltimaHoraDeTotal', { n: g.comerciosUltimaHora ?? 0, total })
        : t('enVivo.tarjetas.comerciosUltimaHora', { n: g.comerciosUltimaHora ?? 0 }),
    },
    {
      id: 'ritmo',
      etiqueta: t('enVivo.tarjetas.pedidosPorMinuto'),
      valor: g.pedidosPorMinuto ?? 0,
      formato: 'decimal',
      tono: 'aviso',
      icono: 'pulso',
      sub: g.ritmoRecord ? t('enVivo.tarjetas.recordHoy', { valor: decimal(g.ritmoRecord.porMinuto) }) : undefined,
    },
    {
      id: 'camino',
      etiqueta: t('enVivo.tarjetas.despachados'),
      valor: g.enCamino ?? g.porEtapa?.camino ?? 0,
      formato: 'entero',
      tono: 'info',
      icono: 'moto',
      sub: t((g.despachosHoy ?? 0) === 1 ? 'enVivo.tarjetas.despachoHoy' : 'enVivo.tarjetas.despachosHoy', { n: g.despachosHoy ?? 0 }),
    },
    {
      id: 'entregados',
      etiqueta: t('enVivo.tarjetas.entregadosHoy'),
      valor: g.entregadosHoy ?? 0,
      formato: 'entero',
      tono: 'ok',
      icono: 'check',
      sub:
        g.ciudadesEntregadas !== undefined
          ? t(g.ciudadesEntregadas === 1 ? 'enVivo.tarjetas.enCiudad' : 'enVivo.tarjetas.enCiudades', { n: g.ciudadesEntregadas })
          : undefined,
    },
  ];

  if (g.opttia && g.opttia.pedidos > 0) {
    tarjetas.push({
      id: 'opttia',
      etiqueta: t('enVivo.tarjetas.conOpttia'),
      valor: ocultar ? g.opttia.pedidos : g.opttia.ventas,
      formato: ocultar ? 'pedidos' : 'dinero',
      tono: 'pack',
      icono: 'ia',
      sub: t(g.opttia.pedidos === 1 ? 'enVivo.tarjetas.pedidoArmado' : 'enVivo.tarjetas.pedidosArmados', { n: g.opttia.pedidos }),
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

export function datosHeroeComercio(estado: EstadoEnVivo, t: Traductor): DatosHeroe | null {
  const c = estado.cifras;
  if (!c) return null;
  return {
    etiqueta: t(estado.soloPropias ? 'enVivo.tarjetas.misVentasHoy' : 'enVivo.tarjetas.ventasHoy'),
    ventas: c.ventas,
    pedidos: c.pedidos,
    ticketPromedio: c.ticketPromedio,
    ayerMismaHora: c.ayerMismaHora,
    porHora: c.porHora,
    proyeccion: estado.radar?.proyeccion ?? null,
    record: estado.radar?.record ?? null,
  };
}

export function datosHeroeKatuq(g: CifrasGlobalEnVivo | null, radar: RadarEnVivo | null, t: Traductor): DatosHeroe | null {
  if (!g) return null;
  return {
    etiqueta: t('enVivo.tarjetas.ventasKatuqHoy'),
    ventas: g.ventas,
    pedidos: g.pedidos,
    ticketPromedio: g.ticketPromedio,
    ayerMismaHora: g.ayerMismaHora ?? null,
    porHora: g.porHora ?? [],
    proyeccion: radar?.proyeccion ?? null,
    record: radar?.record ?? null,
  };
}
