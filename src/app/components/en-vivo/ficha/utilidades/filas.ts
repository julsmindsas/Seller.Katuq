import { EtapaId, EtapaInfo, EventoEnVivo, PedidoEnVivo } from '../../servicios/en-vivo.modelos';
import { claveDeTexto } from '../../servicios/en-vivo-reglas';
import { dineroCorto, horaRelativa, iniciales } from '../../utilidades/formato';
import { claseTono } from '../../utilidades/tonos';
import { FilaVista } from '../ficha.modelos';

/**
 * Filas de las listas de la ficha (por cifra, etapa, ciudad, canal y las del mensajero). Todo puro:
 * recibe lo que ya tiene la pantalla (los pedidos de la foto, o los eventos en toda Katuq) y arma
 * filas con sus textos. No pide nada al servidor.
 */

/** Un pedido reducido a lo que necesita una fila. */
export interface FilaPedido {
  id: string;
  numero: string | null;
  /** Comercio dueño (solo en toda Katuq). */
  empresa: string | null;
  nombreComercio: string | null;
  ciudadComercio: string | null;
  cliente: string | null;
  ciudad: string | null;
  dane: string | null;
  etapa: EtapaId;
  monto: number;
  canal: string | null;
  ia: boolean;
  transportador: string | null;
  /** Instante (ms) para ordenar y para el "hace X": la llegada del pedido, o el último evento si solo hay eventos. */
  ms: number | null;
  /** Hora (ms) en que se vio la entrega; null si no se vio. */
  entregadoMs: number | null;
  /** Hora (ms) en que se vio salir; null si no se vio. */
  salioMs: number | null;
}

/** Cuántas filas se pintan; el resto se resume con "y N más". */
export const MAX_FILAS = 60;

// ── Origen de las filas ─────────────────────────────────────────────────────

/** Filas de los pedidos de la foto del comercio. */
export function filasDePedidos(pedidos: ReadonlyArray<PedidoEnVivo>, empresa: string | null = null): FilaPedido[] {
  return pedidos.map((p) => ({
    id: p.id,
    numero: p.numero,
    empresa: p.empresa ?? empresa,
    nombreComercio: null,
    ciudadComercio: null,
    cliente: p.cliente,
    ciudad: p.ciudad,
    dane: p.dane ?? null,
    etapa: p.etapa,
    monto: p.monto,
    canal: p.canal,
    ia: p.ia === true,
    transportador: p.transportador,
    ms: p.tC ?? null,
    entregadoMs: p.horas?.entregado ?? p.tE ?? null,
    salioMs: p.horas?.camino ?? p.tS ?? null,
  }));
}

function instante(evento: EventoEnVivo): number | null {
  const ms = Date.parse(evento.hora);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Filas desde los eventos, para toda Katuq (su foto no trae pedidos): un pedido por cada `pedidoId`,
 * con lo último que se supo de él. Son los pedidos con movimiento reciente, no todos los de hoy.
 */
export function filasDeEventos(eventos: ReadonlyArray<EventoEnVivo>): FilaPedido[] {
  const ordenados = eventos
    .slice()
    .sort((a, b) => (instante(b) ?? 0) - (instante(a) ?? 0));
  const porPedido = new Map<string, FilaPedido>();

  for (const evento of ordenados) {
    const previa = porPedido.get(evento.pedidoId);
    if (!previa) {
      const noVende = evento.etapa === 'cancelado' || evento.etapa === 'rechazado';
      porPedido.set(evento.pedidoId, {
        id: evento.pedidoId,
        numero: evento.numero ?? null,
        empresa: evento.empresa ?? evento.comercio?.empresa ?? null,
        nombreComercio: evento.nombreComercio ?? evento.comercio?.nombre ?? null,
        ciudadComercio: evento.ciudadComercio ?? evento.comercio?.ciudad ?? null,
        cliente: evento.cliente ?? null,
        ciudad: evento.ciudad ?? null,
        dane: evento.dane ?? null,
        etapa: evento.etapa,
        monto: noVende ? 0 : typeof evento.monto === 'number' ? evento.monto : 0,
        canal: evento.canal ?? null,
        ia: evento.ia === true,
        transportador: evento.transportador ?? null,
        ms: instante(evento),
        entregadoMs: evento.tipo === 'entregado' ? instante(evento) : null,
        salioMs: evento.tipo === 'salida' ? instante(evento) : null,
      });
      continue;
    }
    // Eventos más viejos del mismo pedido: completan lo que el último no traía.
    if (previa.monto === 0 && previa.etapa !== 'cancelado' && previa.etapa !== 'rechazado' && typeof evento.monto === 'number') {
      previa.monto = evento.monto;
    }
    previa.cliente = previa.cliente ?? evento.cliente ?? null;
    previa.ciudad = previa.ciudad ?? evento.ciudad ?? null;
    previa.dane = previa.dane ?? evento.dane ?? null;
    previa.canal = previa.canal ?? evento.canal ?? null;
    previa.ia = previa.ia || evento.ia === true;
    previa.transportador = previa.transportador ?? evento.transportador ?? null;
    previa.nombreComercio = previa.nombreComercio ?? evento.nombreComercio ?? null;
    previa.ciudadComercio = previa.ciudadComercio ?? evento.ciudadComercio ?? null;
    if (evento.tipo === 'entregado' && previa.entregadoMs === null) previa.entregadoMs = instante(evento);
    if (evento.tipo === 'salida' && previa.salioMs === null) previa.salioMs = instante(evento);
  }
  return Array.from(porPedido.values());
}

/** Del más nuevo al más viejo; a igual hora, por id para que el orden sea estable. */
export function ordenarFilas(filas: ReadonlyArray<FilaPedido>): FilaPedido[] {
  return filas.slice().sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0) || a.id.localeCompare(b.id));
}

// ── Filas listas para pintar ────────────────────────────────────────────────

export interface OpcionesFilas {
  /** "Ocultar clientes y montos" (en toda Katuq: comercios y montos). */
  ocultar: boolean;
  /** Toda Katuq: la fila habla del comercio, no del cliente. */
  katuq: boolean;
  ahoraMs: number;
  etapas: ReadonlyMap<EtapaId, EtapaInfo>;
}

/** Quién aparece en la fila: el cliente (comercio) o el comercio (toda Katuq), enmascarado con "ocultar". */
export function quienDeFila(fila: FilaPedido, opciones: Pick<OpcionesFilas, 'ocultar' | 'katuq'>): string {
  if (opciones.katuq) {
    return opciones.ocultar ? `Comercio en ${fila.ciudadComercio || 'Colombia'}` : fila.nombreComercio || 'Comercio';
  }
  return opciones.ocultar ? 'Cliente' : fila.cliente || 'Cliente';
}

/** Hasta `MAX_FILAS` filas con sus textos, y cuántas quedaron sin mostrar. */
export function filasParaPintar(
  filas: ReadonlyArray<FilaPedido>,
  opciones: OpcionesFilas
): { filas: FilaVista[]; restantes: number } {
  const visibles = filas.slice(0, MAX_FILAS);
  const vista = visibles.map((fila): FilaVista => {
    const etapa = opciones.etapas.get(fila.etapa);
    const quien = quienDeFila(fila, opciones);
    const numero = String(fila.numero ?? '').replace(/^\s*#/, '');
    const titulo = numero ? `#${numero} · ${quien}` : quien;
    const hace = horaRelativa(fila.ms, opciones.ahoraMs);
    const subtitulo = [fila.ciudad, etapa?.nombre ?? fila.etapa, hace].filter((x) => !!x).join(' · ');
    const monto = !opciones.ocultar && fila.monto > 0 ? dineroCorto(fila.monto) : '';
    return {
      id: fila.id,
      empresa: fila.empresa,
      iniciales: opciones.katuq ? iniciales(opciones.ocultar ? 'Comercio' : fila.nombreComercio) : iniciales(opciones.ocultar ? 'Cliente' : fila.cliente),
      claseAvatar: claseTono(etapa?.tono ?? 'neutro'),
      titulo,
      subtitulo,
      monto,
      etiquetaAria: `Abrir el pedido ${numero || ''} ${quien}. ${subtitulo}${monto ? `. ${monto}` : ''}`.replace(/\s+/g, ' ').trim(),
    };
  });
  return { filas: vista, restantes: Math.max(0, filas.length - visibles.length) };
}

/** Misma persona o lugar escrito distinto ("Tienda Web" = "tienda-web"). */
export function claveDeCanal(canal: string | null | undefined): string {
  return claveDeTexto(String(canal ?? '').replace(/[-_]+/g, ' '));
}
