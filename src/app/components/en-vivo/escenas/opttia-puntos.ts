import { armarAtencion, conMayuscula } from '../comercio/utilidades/atencion';
import { enmascarar, lineasDelResumen, mascaraDe, vendidoConOpttia } from '../opttia/opttia-reglas';
import { comercioDelMomento, empresaDeEvento } from '../plataforma/utilidades/momento';
import { nombreVisible } from '../plataforma/utilidades/nombres';
import type { AccionUi } from '../servicios/en-vivo-acciones';
import { ComercioEnVivo, EstadoEnVivo, EventoEnVivo } from '../servicios/en-vivo.modelos';
import { armarFlota } from '../utilidades/flota';
import { dinero, diaDeColombia } from '../utilidades/formato';

/**
 * Lo que el orbe de Opttia quiere mostrar en las escenas (D-386, 5.14), todo puro: de qué puntos
 * se compone su lista, cómo se resuelve una respuesta de Opttia a un lugar y qué dice cuando llega
 * un pedido armado por Opttia. Los textos salen del radar y del resumen que YA llegaron (sin
 * llamar al modelo) y respetan "ocultar". Sin Angular ni three: se prueba con node suelto.
 */

/** Dónde puede estar lo que Opttia señala. `veh` = moto o camión (por nombre del transportador). */
export type ObjetivoOrbe =
  | { tipo: 'comercio'; id: string }
  | { tipo: 'ciudad'; id: string }
  | { tipo: 'pedido'; id: string }
  | { tipo: 'veh'; id: string }
  | { tipo: 'estacion'; id: string };

/** Un punto de la lista del orbe: qué señalar y qué decir. */
export interface PuntoOrbe {
  /** Identifica el punto entre lecturas. */
  clave: string;
  /** null = Opttia habla desde donde está, sin señalar nada. */
  obj: ObjetivoOrbe | null;
  /** Dónde ir si `obj` no está a la vista (p. ej. la estación donde llegan los pedidos). */
  alterno?: ObjetivoOrbe | null;
  /** `bad`, `warn`, `info`, `ok`, `accent`, `pack`, `slate`. */
  tono: string;
  texto: string;
}

/** Cuántos puntos tiene a lo sumo la lista (cada 16 s pasa al siguiente: más de 8 daría vueltas muy largas). */
export const MAX_PUNTOS_ORBE = 8;

/** La estación donde llegan los pedidos de un comercio. */
export const ESTACION_LLEGADA: ObjetivoOrbe = { tipo: 'estacion', id: 'recibido' };

type EntradaPuntos = Pick<
  EstadoEnVivo,
  'vista' | 'radar' | 'flota' | 'pedidos' | 'actualizadoEn' | 'cifras' | 'cifrasGlobal' | 'eventos' | 'opttia' | 'soloLectura'
>;

/** `Hoy te armé 3 pedidos por WhatsApp.` */
const pedidosTexto = (n: number): string => `${n} ${n === 1 ? 'pedido' : 'pedidos'}`;

/** Punto final de la frase, sin duplicarlo. */
function frase(texto: string): string {
  const t = String(texto ?? '').trim();
  return !t ? '' : /[.!?…]$/.test(t) ? t : `${t}.`;
}

function minusInicial(texto: string): string {
  const t = String(texto ?? '').trim();
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

/** Cuántas llegadas "Con Opttia" de HOY cuentan los eventos que la pantalla tiene, por comercio. */
function llegadasConOpttia(eventos: ReadonlyArray<EventoEnVivo>, ahoraMs: number): Map<string, number> {
  const hoy = diaDeColombia(ahoraMs);
  const cuenta = new Map<string, number>();
  for (const ev of eventos) {
    if (ev.tipo !== 'pedido_nuevo' || ev.ia !== true) continue;
    const empresa = empresaDeEvento(ev);
    const ms = Date.parse(ev.hora);
    if (!empresa || !Number.isFinite(ms) || diaDeColombia(ms) !== hoy) continue;
    cuenta.set(empresa, (cuenta.get(empresa) ?? 0) + 1);
  }
  return cuenta;
}

function identidadDe(c: ComercioEnVivo | undefined, respaldo: string | null | undefined): { nombre: string | null; ciudad: string | null } {
  return { nombre: c?.nombre ?? respaldo ?? null, ciudad: c?.ciudad ?? null };
}

/** Los puntos de la vista de un comercio: "Atención ahora" (radar.atencion) y lo que Opttia armó por WhatsApp. */
function puntosDeComercio(e: EntradaPuntos): PuntoOrbe[] {
  const flota = armarFlota(e.flota, e.pedidos, e.actualizadoEn);
  const puntos: PuntoOrbe[] = armarAtencion(e.radar, flota).map((i): PuntoOrbe => {
    const accion = i.accion;
    const obj: ObjetivoOrbe = !accion
      ? ESTACION_LLEGADA
      : accion.tipo === 'pedido'
        ? { tipo: 'pedido', id: accion.pedidoId }
        : { tipo: 'veh', id: accion.nombre };
    return {
      clave: `a|${i.clave}`,
      obj,
      alterno: ESTACION_LLEGADA,
      tono: i.clase.replace(/^t-/, ''),
      texto: [frase(i.titulo), i.sugerencia ? frase(i.sugerencia) : ''].filter(Boolean).join(' '),
    };
  });
  const vendido = vendidoConOpttia(e);
  if (vendido) {
    puntos.push({
      clave: 'ia|hoy',
      obj: ESTACION_LLEGADA,
      tono: 'pack',
      texto: e.soloLectura
        ? `Hoy armó ${pedidosTexto(vendido.pedidos)} por WhatsApp con Opttia.`
        : `Hoy te armé ${pedidosTexto(vendido.pedidos)} por WhatsApp.`,
    });
  }
  return puntos.slice(0, MAX_PUNTOS_ORBE);
}

/** Los puntos de toda Katuq: alertas del radar, el comercio del momento y donde más vendió Opttia por WhatsApp. */
function puntosDeKatuq(e: EntradaPuntos, ocultar: boolean, ahoraMs: number): PuntoOrbe[] {
  const comercios = e.cifrasGlobal?.comercios ?? [];
  const puntos: PuntoOrbe[] = [];
  const alertas = (e.radar?.alertas ?? [])
    .map((a, indice) => ({ a, indice }))
    .sort((x, y) => y.a.sev - x.a.sev || x.indice - y.indice);
  for (const { a } of alertas) {
    const c = a.empresa ? comercios.find((x) => x.empresa === a.empresa) : comercios.find((x) => x.nombre === a.comercio);
    const empresa = a.empresa ?? c?.empresa ?? null;
    const nombre = nombreVisible(identidadDe(c, a.comercio), ocultar);
    puntos.push({
      clave: `r|${empresa ?? a.comercio ?? ''}|${a.tipo}`,
      obj: empresa ? { tipo: 'comercio', id: empresa } : null,
      tono: a.tono === 'peligro' ? 'bad' : a.tono === 'aviso' ? 'warn' : a.tono === 'ok' ? 'ok' : a.tono === 'acento' ? 'accent' : 'info',
      texto: `${nombre}: ${frase(minusInicial(a.titulo))} ${a.sugerencia ? frase(conMayuscula(a.sugerencia)) : ''}`.trim(),
    });
  }

  const momento = comercioDelMomento(comercios, e.eventos, ahoraMs, ocultar);
  if (momento && !puntos.some((p) => p.obj?.id === momento.empresa)) {
    puntos.push({
      clave: `m|${momento.empresa}`,
      obj: { tipo: 'comercio', id: momento.empresa },
      tono: 'warn',
      texto: `${momento.nombre} está en racha: ${pedidosTexto(momento.pedidos)} en 30 minutos.`,
    });
  }

  let mejor: { empresa: string; n: number } | null = null;
  llegadasConOpttia(e.eventos, ahoraMs).forEach((n, empresa) => {
    if (!mejor || n > mejor.n || (n === mejor.n && empresa < mejor.empresa)) mejor = { empresa, n };
  });
  const top = mejor as { empresa: string; n: number } | null;
  if (top) {
    const c = comercios.find((x) => x.empresa === top.empresa);
    const nombre = nombreVisible(identidadDe(c, top.empresa), ocultar);
    puntos.push({
      clave: `ia|${top.empresa}`,
      obj: { tipo: 'comercio', id: top.empresa },
      tono: 'pack',
      texto: `Aquí fue donde más vendí hoy por WhatsApp: ${pedidosTexto(top.n)} en ${nombre}.`,
    });
  }
  return puntos.slice(0, MAX_PUNTOS_ORBE);
}

/**
 * La lista del orbe, de lo más urgente a lo menos urgente. Los textos ya van con "ocultar" aplicado
 * (montos y nombres de comercios). Vacía = nada que señalar.
 */
export function puntosDelOrbe(e: EntradaPuntos, ocultar: boolean, ahoraMs: number): PuntoOrbe[] {
  const crudos = e.vista === 'katuq' ? puntosDeKatuq(e, ocultar, ahoraMs) : puntosDeComercio(e);
  const mascara = mascaraDe(e, ocultar);
  return crudos.map((p) => ({ ...p, texto: enmascarar(p.texto, mascara) }));
}

/** Lo que Opttia dice cuando no tiene nada que señalar: el titular y los puntos del último resumen. */
export function lineasParaHablar(e: Pick<EstadoEnVivo, 'vista' | 'cifrasGlobal' | 'opttia'>, ocultar: boolean): string[] {
  return lineasDelResumen(e.opttia, mascaraDe(e, ocultar));
}

// ── Respuestas de Opttia ────────────────────────────────────────────────────

/** Lo que de una respuesta le importa al orbe (la tarjeta de Opttia entrega más; esto es lo mínimo). */
export interface RespuestaOrbe {
  texto: string;
  acciones: ReadonlyArray<{ accion: AccionUi }>;
}

/**
 * Dónde está, en la escena, lo que una acción de Opttia abre: un pedido, un mensajero, un comercio o
 * una ciudad. Las listas por etapa, canal o "todos" no tienen lugar (null).
 */
export function objetivoDeAccion(accion: AccionUi): ObjetivoOrbe | null {
  switch (accion.tipo) {
    case 'abrir-pedido':
      return accion.pedidoId ? { tipo: 'pedido', id: accion.pedidoId } : null;
    case 'abrir-mensajero':
      return accion.nombre ? { tipo: 'veh', id: accion.nombre } : null;
    case 'abrir-comercio':
      return accion.empresa ? { tipo: 'comercio', id: accion.empresa } : null;
    case 'abrir-lista': {
      if (accion.clave.startsWith('ciudad:')) {
        const dane = accion.clave.slice('ciudad:'.length).trim();
        return dane ? { tipo: 'ciudad', id: dane } : null;
      }
      return null;
    }
    default:
      return null;
  }
}

/** El primer objetivo con lugar entre las acciones de una respuesta. */
export function objetivoDeRespuesta(respuesta: RespuestaOrbe | null | undefined): ObjetivoOrbe | null {
  for (const a of respuesta?.acciones ?? []) {
    const obj = objetivoDeAccion(a.accion);
    if (obj) return obj;
  }
  return null;
}

/** La respuesta en una línea para la burbuja (a lo sumo `max` caracteres, cortada en una palabra). */
export function textoParaBurbuja(texto: string, max = 150): string {
  const plano = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (plano.length <= max) return plano;
  const corte = plano.slice(0, max - 1);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,;:.]+$/, '')}…`;
}

// ── Pedido "Con Opttia" ─────────────────────────────────────────────────────

/** Qué hace el orbe cuando llega un pedido armado por Opttia. */
export interface EntregaOrbe {
  obj: ObjetivoOrbe;
  alterno: ObjetivoOrbe | null;
  texto: string;
}

/**
 * El orbe va a donde llega un pedido "Con Opttia" (`ev.ia`). Solo cuenta un `pedido_nuevo`. En un
 * comercio es la caja nueva (o la estación de llegada, si aún no está) y la ciudad del pedido en el
 * mapa; en toda Katuq, el comercio que lo recibió. Con "ocultar" no dice montos ni nombres.
 */
export function entregaDeEvento(ev: EventoEnVivo, vista: 'comercio' | 'katuq', ocultar: boolean): EntregaOrbe | null {
  if (ev.tipo !== 'pedido_nuevo' || ev.ia !== true) return null;
  if (vista === 'katuq') {
    const empresa = empresaDeEvento(ev);
    if (!empresa) return null;
    const nombre = nombreVisible(
      { nombre: ev.nombreComercio ?? ev.comercio?.nombre ?? null, ciudad: ev.ciudadComercio ?? ev.comercio?.ciudad ?? null },
      ocultar
    );
    return { obj: { tipo: 'comercio', id: empresa }, alterno: null, texto: `¡Le armé un pedido a ${nombre} por WhatsApp!` };
  }
  const monto = typeof ev.monto === 'number' && Number.isFinite(ev.monto) && ev.monto > 0 ? ev.monto : 0;
  return {
    obj: { tipo: 'pedido', id: ev.pedidoId },
    alterno: ESTACION_LLEGADA,
    texto: `¡Este lo armé yo por WhatsApp!${ocultar || !monto ? '' : ` ${dinero(monto)}`}`,
  };
}
