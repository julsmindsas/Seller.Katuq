import {
  ComercioEnVivo,
  EventoEnVivo,
  RadarEnVivo,
  TipoEvento,
  TonoEnVivo,
} from '../../servicios/en-vivo.modelos';
import { dinero, duracion, FormatoCifra, horaDeColombia, horaRelativa } from '../../utilidades/formato';
import { ventanaHoras } from '../../utilidades/horas';
import { empresaDeEvento } from './momento';
import { claseDeComercio, inicialesVisibles, mantenerOrdenEstable, nombreVisible } from './nombres';
import { alertasPorEmpresa } from './radar';

/**
 * El muro de comercios: una tarjeta por comercio con sus ventas y pedidos de hoy, las barras por hora
 * de hoy contra la línea de ayer, su último evento, sus pedidos por etapa y su estado (Vendiendo,
 * Hace N min, Revisar o Atención). Todo puro: las cifras son las del servidor (`cifrasGlobal.comercios`).
 */

// ── Barras por hora ─────────────────────────────────────────────────────────

/** Tamaño del dibujo de las barras (viewBox). */
export const SPARK_ANCHO = 150;
export const SPARK_ALTO = 34;
/** Alto útil de una barra completa (deja 2 de aire arriba). */
const SPARK_UTIL = 32;

export interface BarraSpark {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Hora que todavía no llega: se dibuja pálida. */
  futura: boolean;
}

export interface Spark {
  barras: BarraSpark[];
  /** `points` de la línea de ayer. */
  linea: string;
}

const redondear = (n: number): number => Math.round(n * 10) / 10;

/**
 * Barras por hora de hoy contra la línea de ayer, de las 15 horas que muestra la gráfica (las
 * mismas que `ventas-hora`). `hoy` y `ayer` son los 24 valores del servidor (`porHora`).
 */
export function sparkline(
  hoy: ReadonlyArray<number> | null | undefined,
  ayer: ReadonlyArray<number> | null | undefined,
  horaActual: number
): Spark {
  const horas = ventanaHoras(horaActual);
  const valor = (serie: ReadonlyArray<number> | null | undefined, hora: number): number => {
    const v = serie ? serie[hora] : 0;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
  };
  const pares = horas.map((h) => ({ h, hoy: valor(hoy, h), ayer: valor(ayer, h) }));
  const maximo = pares.reduce((m, p) => Math.max(m, p.hoy, p.ayer), 1);
  const paso = SPARK_ANCHO / horas.length;

  const barras = pares.map((p, i): BarraSpark => {
    const alto = Math.max(1, (p.hoy / maximo) * SPARK_UTIL);
    return {
      x: redondear(i * paso + 1),
      y: redondear(SPARK_ALTO - alto),
      ancho: redondear(paso - 2),
      alto: redondear(alto),
      futura: p.h > horaActual,
    };
  });
  const linea = pares
    .map((p, i) => `${redondear(i * paso + paso / 2)},${redondear(SPARK_ALTO - (p.ayer / maximo) * SPARK_UTIL)}`)
    .join(' ');
  return { barras, linea };
}

// ── Tarjetas ────────────────────────────────────────────────────────────────

export interface EstadoTarjeta {
  texto: string;
  /** `t-ok`, `t-slate`, `t-warn`, `t-bad`. */
  clase: string;
}

export interface TramoPipeline {
  texto: string;
  titulo: string;
}

export interface TarjetaMuro {
  empresa: string;
  nombre: string;
  nombreReal: string;
  iniciales: string;
  clase: string;
  /** Ciudad del comercio ("" con la privacidad: ya va en el nombre). */
  ciudad: string;
  /** Lo que ruedan los dígitos: ventas, o con la privacidad los pedidos. */
  valor: number;
  formato: FormatoCifra;
  /** "12 pedidos" (vacío con la privacidad: el valor ya son los pedidos). */
  pedidos: string;
  estado: EstadoTarjeta;
  /** Borde y anillo del color de la alerta: 'bad', 'warn' o ''. */
  alerta: 'bad' | 'warn' | '';
  spark: Spark;
  /** "Nuevo pedido · hace 3 min · $85.000" o "Sin eventos todavía". */
  ultimo: string;
  pipeline: TramoPipeline[];
  etiqueta: string;
}

export interface EntradaMuro {
  /** Eventos de toda Katuq, del más nuevo al más viejo. */
  eventos: ReadonlyArray<EventoEnVivo>;
  radar: RadarEnVivo | null;
  ocultar: boolean;
  ahoraMs: number;
}

/** Hasta cuándo un comercio con un pedido reciente sigue "Vendiendo". */
export const VENDIENDO_MS = 10 * 60 * 1000;

const ROTULO_EVENTO: Readonly<Record<TipoEvento, string>> = {
  pedido_nuevo: 'Nuevo pedido',
  cambio_estado: 'Cambio de estado',
  pago_confirmado: 'Pago confirmado',
  salida: 'Salió a entrega',
  asignado: 'Asignado',
  entregado: 'Entregado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export function rotuloDeEvento(tipo: TipoEvento | string): string {
  return ROTULO_EVENTO[tipo as TipoEvento] ?? 'Cambio';
}

interface Actividad {
  tipo: TipoEvento;
  ms: number;
  monto: number | null;
}

function msDe(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const ms = Date.parse(hora);
  return Number.isFinite(ms) ? ms : null;
}

/** Lo último que se supo de cada comercio: el evento más nuevo de la lista (ya viene de más nuevo a más viejo) y la última llegada. */
function actividadPorComercio(
  eventos: ReadonlyArray<EventoEnVivo>
): { ultimo: Map<string, Actividad>; llegada: Map<string, number> } {
  const ultimo = new Map<string, Actividad>();
  const llegada = new Map<string, number>();
  for (const evento of eventos) {
    const empresa = empresaDeEvento(evento);
    const ms = msDe(evento.hora);
    if (!empresa || ms === null) continue;
    const previo = ultimo.get(empresa);
    if (!previo || ms > previo.ms) {
      ultimo.set(empresa, { tipo: evento.tipo, ms, monto: typeof evento.monto === 'number' ? evento.monto : null });
    }
    if (evento.tipo === 'pedido_nuevo' && ms > (llegada.get(empresa) ?? 0)) llegada.set(empresa, ms);
  }
  return { ultimo, llegada };
}

function claseDeAlerta(tono: TonoEnVivo | undefined): 'bad' | 'warn' | '' {
  if (!tono) return '';
  return tono === 'peligro' ? 'bad' : 'warn';
}

/**
 * Estado de la tarjeta: la alerta (Atención o Revisar) manda; si no, "Vendiendo" si entró un pedido
 * hace menos de 10 minutos; si no, hace cuánto fue el último. Sin llegadas conocidas (el servidor
 * solo ve las llegadas desde que arrancó) queda un rótulo neutro que no inventa nada.
 */
export function estadoDeTarjeta(
  alerta: 'bad' | 'warn' | '',
  llegadaMs: number | null,
  pedidosHoy: number,
  ahoraMs: number
): EstadoTarjeta {
  if (alerta === 'bad') return { texto: 'Atención', clase: 't-bad' };
  if (alerta === 'warn') return { texto: 'Revisar', clase: 't-warn' };
  if (llegadaMs !== null) {
    const quieto = Math.max(0, ahoraMs - llegadaMs);
    return quieto < VENDIENDO_MS
      ? { texto: 'Vendiendo', clase: 't-ok' }
      : { texto: `Hace ${duracion(quieto)}`, clase: 't-slate' };
  }
  return { texto: pedidosHoy > 0 ? 'Con pedidos hoy' : 'Sin pedidos hoy', clase: 't-slate' };
}

/** Lo que pinta el muro: las tarjetas en un orden que no brinca entre lecturas. */
export interface VistaMuro {
  tarjetas: TarjetaMuro[];
  /** Llaves en el orden estable de las tarjetas. */
  orden: ReadonlyArray<string>;
}

export const MURO_VACIO: VistaMuro = { tarjetas: [], orden: [] };

/**
 * Siguiente muro. Las tarjetas no cambian de sitio cada vez que un comercio adelanta a otro (el
 * muro es para mirar y tocar, no una carrera): conservan su lugar, las nuevas van al final y las que
 * ya no llegan se quitan. La primera lectura queda en el orden del servidor (de más a menos ventas).
 */
export function reducirMuro(
  previo: VistaMuro,
  comercios: ReadonlyArray<ComercioEnVivo>,
  entrada: EntradaMuro
): VistaMuro {
  const tarjetas = armarMuro(comercios, entrada);
  const orden = mantenerOrdenEstable(previo.orden, tarjetas.map((t) => t.empresa));
  const porEmpresa = new Map<string, TarjetaMuro>();
  for (const tarjeta of tarjetas) porEmpresa.set(tarjeta.empresa, tarjeta);
  return { tarjetas: orden.map((clave) => porEmpresa.get(clave) as TarjetaMuro), orden };
}

/** Una tarjeta por comercio, en el orden en que llegan. `reducirMuro` se encarga de mantener un orden estable. */
export function armarMuro(comercios: ReadonlyArray<ComercioEnVivo>, entrada: EntradaMuro): TarjetaMuro[] {
  const { eventos, radar, ocultar, ahoraMs } = entrada;
  const { ultimo, llegada } = actividadPorComercio(eventos);
  const alertas = alertasPorEmpresa(radar);
  const hora = horaDeColombia(ahoraMs);

  return comercios
    .filter((c) => !!c && !!c.empresa)
    .map((c): TarjetaMuro => {
      const nombre = nombreVisible(c, ocultar);
      const alerta = claseDeAlerta(alertas.get(c.empresa));

      // El último evento: el del servidor (`ultimoEvento`) o el más nuevo de la lista, el que sea más reciente.
      const msServidor = c.ultimoEvento ? msDe(c.ultimoEvento.hora) : null;
      const delServidor: Actividad | null =
        c.ultimoEvento && msServidor !== null ? { tipo: c.ultimoEvento.tipo, ms: msServidor, monto: null } : null;
      const deLista = ultimo.get(c.empresa) ?? null;
      const elegido: Actividad | null = deLista && (!delServidor || deLista.ms >= delServidor.ms) ? deLista : delServidor;
      const llegadaServidor = c.ultimoEvento && c.ultimoEvento.tipo === 'pedido_nuevo' ? msServidor : null;
      const ultimaLlegada = Math.max(llegada.get(c.empresa) ?? 0, llegadaServidor ?? 0) || null;

      const hace = elegido ? horaRelativa(elegido.ms, ahoraMs) : '';
      const monto = !ocultar && elegido && elegido.tipo === 'pedido_nuevo' && elegido.monto !== null && elegido.monto > 0 ? dinero(elegido.monto) : '';
      const ultimoTexto = elegido
        ? [rotuloDeEvento(elegido.tipo), hace, monto].filter((p) => !!p).join(' · ')
        : 'Sin eventos todavía';

      const etapas = c.etapas ?? ({} as ComercioEnVivo['etapas']);
      const enPreparacion = (etapas.recibido ?? 0) + (etapas.produccion ?? 0) + (etapas.producido ?? 0) + (etapas.empacado ?? 0);
      const pedidosTexto = `${c.n} ${c.n === 1 ? 'pedido' : 'pedidos'}`;
      const estado = estadoDeTarjeta(alerta, ultimaLlegada, c.n, ahoraMs);

      return {
        empresa: c.empresa,
        nombre,
        nombreReal: String(c.nombre ?? '').trim() || c.empresa,
        iniciales: inicialesVisibles(c, ocultar),
        clase: claseDeComercio(c.empresa),
        ciudad: ocultar ? '' : String(c.ciudad ?? '').trim(),
        valor: ocultar ? c.n : c.ventas,
        formato: ocultar ? 'ventas' : 'dinero',
        pedidos: ocultar ? '' : pedidosTexto,
        estado,
        alerta,
        spark: sparkline(c.porHora?.ventas, c.porHora?.ventasAyer, hora),
        ultimo: ultimoTexto,
        pipeline: [
          { texto: `${enPreparacion} prep.`, titulo: 'En preparación' },
          { texto: `${etapas.listo ?? 0} para despachar`, titulo: 'Para despachar' },
          { texto: `${etapas.camino ?? 0} en ruta`, titulo: 'Despachados' },
          { texto: `${etapas.entregado ?? 0} entr.`, titulo: 'Entregados' },
        ],
        etiqueta: `${nombre}: ${pedidosTexto} hoy, ${estado.texto.toLowerCase()}. Abrir su tablero`,
      };
    });
}
