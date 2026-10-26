/**
 * Historial del pedido (D-541, F1): funciones PURAS de la pantalla. Sin Angular, sin red.
 *
 *  - Todas las horas se muestran en hora de Colombia (`America/Bogota`, UTC−5, sin horario de
 *    verano), no en la del navegador: un cambio de las 3:45 p. m. dice 3:45 p. m. en cualquier
 *    computador. El servidor guarda el instante en UTC (ISO).
 *  - El día de cada evento se decide en hora de Colombia: un cambio de las 8:30 p. m. no cae en el
 *    día siguiente aunque ya sea otro día en UTC.
 *  - Pesos colombianos sin decimales y puntos de miles, como el resto de Katuq: «$200.000».
 *  - La diferencia lleva signo: «+$35.670»; una baja usa el signo menos «−», no el guion.
 *
 * Lo prueba `tests/ventas/historial-pedido.util.test.js`.
 */

import {
  ConsultaHistorialPedido,
  DetalleHistorialPedido,
  EventoHistorialPedido,
  MontosHistorialPedido,
  ResumenHistorialPedido,
} from '../../../shared/models/historial-pedido.model';

export const ZONA_COLOMBIA = 'America/Bogota';
const MENOS = '−';
const FLECHA = '→';

/** Marca y nota de un evento reconstruido (design D10). */
export const TEXTO_RECONSTRUIDO = 'Registro reconstruido';
export const NOTA_RECONSTRUIDO = 'Armado con los datos actuales del pedido';

const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function aFecha(iso: any): Date | null {
  if (iso === null || iso === undefined || iso === '') return null;
  const f = iso instanceof Date ? iso : new Date(iso);
  return isNaN(f.getTime()) ? null : f;
}

interface PartesColombia {
  anio: number;
  mes: number; // 1-12
  dia: number;
  diaSemana: number; // 0 = domingo
  hora: number; // 0-23
  minuto: number;
  segundo: number;
}

const dd = (n: number): string => String(n).padStart(2, '0');

/** Año, mes, día y día de la semana en Colombia, sin depender de la zona del navegador. */
export function partesColombia(iso: any): PartesColombia | null {
  const f = aFecha(iso);
  if (!f) return null;
  // Colombia es UTC−5 todo el año: se resta a mano y se lee en UTC (más estable que `Intl`).
  const c = new Date(f.getTime() - 5 * 3600 * 1000);
  return {
    anio: c.getUTCFullYear(), mes: c.getUTCMonth() + 1, dia: c.getUTCDate(), diaSemana: c.getUTCDay(),
    hora: c.getUTCHours(), minuto: c.getUTCMinutes(), segundo: c.getUTCSeconds(),
  };
}

/** Clave estable del día en Colombia: «2026-10-23». Sirve para agrupar. */
export function claveDiaColombia(iso: any): string {
  const p = partesColombia(iso);
  if (!p) return 'sin-fecha';
  return `${p.anio}-${dd(p.mes)}-${dd(p.dia)}`;
}

/**
 * Título del día de un grupo: «HOY», «AYER» o «MARTES 21 DE OCTUBRE» (con el año si no es el actual).
 * `ahora` se recibe para poder probarlo.
 */
export function etiquetaDia(iso: any, ahora: Date = new Date()): string {
  const p = partesColombia(iso);
  if (!p) return 'SIN FECHA';
  const clave = claveDiaColombia(iso);
  if (clave === claveDiaColombia(ahora)) return 'HOY';
  if (clave === claveDiaColombia(new Date(ahora.getTime() - 24 * 3600 * 1000))) return 'AYER';
  const actual = partesColombia(ahora);
  const conAnio = !actual || actual.anio !== p.anio;
  const texto = `${DIAS_SEMANA[p.diaSemana]} ${p.dia} de ${MESES_LARGOS[p.mes - 1]}${conAnio ? ` de ${p.anio}` : ''}`;
  return texto.toUpperCase();
}

/** «3:45» o «3:45:12» más «p. m.»: reloj de 12 horas escrito a mano, igual en todos los navegadores. */
function reloj(p: PartesColombia, conSegundos: boolean): string {
  const h12 = p.hora % 12 === 0 ? 12 : p.hora % 12;
  return `${h12}:${dd(p.minuto)}${conSegundos ? `:${dd(p.segundo)}` : ''} ${p.hora < 12 ? 'a. m.' : 'p. m.'}`;
}

/** Hora con segundos en Colombia: «3:45:12 p. m.». */
export function horaConSegundos(iso: any): string {
  const p = partesColombia(iso);
  return p ? reloj(p, true) : '';
}

/**
 * Fecha y hora en Colombia: «23 oct 2026, 10:54 a. m.». Se arma a mano porque
 * `toLocaleString('es-CO')` no escribe igual en todos los navegadores. Un valor que no es fecha se
 * devuelve como texto.
 */
export function fechaHoraColombia(iso: any): string {
  if (iso === null || iso === undefined || iso === '') return '-';
  const p = partesColombia(iso);
  if (!p) return String(iso);
  return `${dd(p.dia)} ${MESES_CORTOS[p.mes - 1]} ${p.anio}, ${reloj(p, false)}`;
}

const esNumero = (v: any): boolean => v !== null && v !== undefined && v !== '' && isFinite(Number(v));

/** Pesos sin decimales, con puntos de miles: «$200.000». Un número negativo lleva «−». */
export function formatoCOP(valor: any): string {
  if (!esNumero(valor)) return '';
  const n = Math.round(Number(valor));
  const texto = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? MENOS : ''}$${texto}`;
}

/** Diferencia en pesos con signo: «+$35.670» o «−$20.000». Cero es «$0». */
export function diferenciaConSigno(valor: any): string {
  if (!esNumero(valor)) return '';
  const n = Math.round(Number(valor));
  if (n === 0) return '$0';
  return `${n > 0 ? '+' : MENOS}${formatoCOP(Math.abs(n))}`;
}

/**
 * La pastilla de plata de un evento: «$200.000 → $180.000 (−$20.000)». Sin saldo no hay pastilla;
 * solo con el saldo de después (la creación) se dice «Saldo $150.000».
 */
export function lineaSaldo(m: MontosHistorialPedido | null | undefined): string {
  if (!m) return '';
  const tieneAntes = esNumero(m.saldoAntes);
  const tieneDespues = esNumero(m.saldoDespues);
  if (tieneAntes && tieneDespues) {
    const dif = Number(m.saldoDespues) - Number(m.saldoAntes);
    return `${formatoCOP(m.saldoAntes)} ${FLECHA} ${formatoCOP(m.saldoDespues)} (${diferenciaConSigno(dif)})`;
  }
  if (tieneDespues) return `Saldo ${formatoCOP(m.saldoDespues)}`;
  return '';
}

/** El pago del evento: «Pago $50.000». Vacío si el evento no mueve plata. */
export function lineaPago(m: MontosHistorialPedido | null | undefined): string {
  if (!m || !esNumero(m.pago)) return '';
  return `Pago ${formatoCOP(m.pago)}`;
}

/** Un valor de un detalle para mostrarlo: vacío es «Sin dato», la plata va en pesos, una lista con comas. */
export function textoDetalle(d: DetalleHistorialPedido, lado: 'antes' | 'despues'): string {
  const v: any = d ? d[lado] : null;
  if (Array.isArray(v)) return v.length ? v.map((x) => String(x)).join(', ') : 'Sin dato';
  if (v === null || v === undefined || v === '') return 'Sin dato';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (d.clase === 'dinero' && esNumero(v)) return formatoCOP(v);
  return String(v);
}

/** «Motivo: …» si lo escribieron; si faltó, la nota del servidor («Sin motivo (App)»); si no aplica, vacío. */
export function lineaMotivo(e: Pick<EventoHistorialPedido, 'motivo' | 'notaMotivo'> | null | undefined): string {
  if (!e) return '';
  if (e.motivo) return `Motivo: ${e.motivo}`;
  return e.notaMotivo || '';
}

/** «12 movimientos · último: Pago registrado». */
export function lineaMovimientos(r: Pick<ResumenHistorialPedido, 'totalEventos' | 'ultimoCambio'> | null | undefined): string {
  if (!r) return '';
  const n = Number(r.totalEventos) || 0;
  if (n <= 0) return 'Sin movimientos';
  const base = `${n} ${n === 1 ? 'movimiento' : 'movimientos'}`;
  return r.ultimoCambio && r.ultimoCambio.titulo ? `${base} · último: ${r.ultimoCambio.titulo}` : base;
}

// ── Aspecto por tipo (D-541 D10: azulejo de 32 px con par semántico) ─────────

export type TonoEvento = 'primario' | 'info' | 'alerta' | 'peligro' | 'exito' | 'neutro';

export interface AspectoEvento {
  /** Clase de PrimeIcons. */
  icono: string;
  /** Sufijo de la clase de color: `hist-tono--<tono>`. */
  tono: TonoEvento;
}

const NEUTRO: AspectoEvento = { icono: 'pi pi-info-circle', tono: 'neutro' };

const ASPECTOS: Record<string, AspectoEvento> = {
  order_created: { icono: 'pi pi-plus', tono: 'primario' },
  process_status_changed: { icono: 'pi pi-arrow-right', tono: 'info' },
  payment_status_changed: { icono: 'pi pi-credit-card', tono: 'info' },
  delivery_reported: { icono: 'pi pi-check-circle', tono: 'exito' },
  payment_registered: { icono: 'pi pi-wallet', tono: 'exito' },
  payment_edited: { icono: 'pi pi-pencil', tono: 'alerta' },
  payment_voided: { icono: 'pi pi-ban', tono: 'peligro' },
  payment_verified: { icono: 'pi pi-check-circle', tono: 'exito' },
  order_deleted: { icono: 'pi pi-trash', tono: 'peligro' },
  line_price_corrected: { icono: 'pi pi-tag', tono: 'alerta' },
  order_note_added: { icono: 'pi pi-comment', tono: 'neutro' },
  order_note_edited: { icono: 'pi pi-pencil', tono: 'neutro' },
  delivery_notes_changed: { icono: 'pi pi-comment', tono: 'neutro' },
  gift_card_changed: { icono: 'pi pi-gift', tono: 'neutro' },
  delivery_address_changed: { icono: 'pi pi-map-marker', tono: 'info' },
  delivery_schedule_changed: { icono: 'pi pi-calendar', tono: 'info' },
  delivery_contact_changed: { icono: 'pi pi-phone', tono: 'info' },
  advisor_changed: { icono: 'pi pi-user', tono: 'info' },
  billing_data_changed: { icono: 'pi pi-file', tono: 'info' },
};

/**
 * Ícono y par de color de un evento. Depende del tipo y, donde el resultado cambia el sentido, de lo
 * que el servidor ya dice: un retroceso de proceso es alerta; un proceso que termina en Cancelado,
 * una entrega rechazada y un pago rechazado son error.
 */
export function aspectoEvento(e: Partial<EventoHistorialPedido> | null | undefined): AspectoEvento {
  if (!e || !e.tipo || !Object.prototype.hasOwnProperty.call(ASPECTOS, String(e.tipo))) return { ...NEUTRO };
  const tipo = String(e.tipo);
  if (tipo === 'process_status_changed') {
    const proceso = (e.detalles || []).find((d) => d && d.etiqueta === 'Estado del proceso');
    if (proceso && proceso.despues === 'Cancelado') return { icono: 'pi pi-ban', tono: 'peligro' };
    if (e.retroceso) return { icono: 'pi pi-arrow-left', tono: 'alerta' };
  }
  const titulo = String(e.titulo || '');
  if ((tipo === 'delivery_reported' || tipo === 'payment_verified') && /rechazad/i.test(titulo)) {
    return { icono: 'pi pi-times-circle', tono: 'peligro' };
  }
  return { ...ASPECTOS[tipo] };
}

/** La pastilla de origen: pizarra para Sistema e integraciones, neutra para una persona. */
export function tonoOrigen(e: Partial<EventoHistorialPedido> | null | undefined): 'pizarra' | 'neutro' {
  return e && e.sistema ? 'pizarra' : 'neutro';
}

/** ¿Se armó con los datos actuales del pedido y no con un evento real? */
export function esReconstruido(e: Partial<EventoHistorialPedido> | null | undefined): boolean {
  return !!e && e.fuente === 'reconstruido';
}

// ── Agrupar por día ──────────────────────────────────────────────────────────

export interface GrupoDia {
  clave: string;
  etiqueta: string;
  eventos: EventoHistorialPedido[];
}

/**
 * Junta los eventos por día de Colombia conservando el orden en que llegan (el servidor ya los
 * manda ordenados y una página nueva continúa donde terminó la anterior).
 */
export function agruparPorDia(eventos: EventoHistorialPedido[] | null | undefined, ahora: Date = new Date()): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const e of eventos || []) {
    const clave = claveDiaColombia(e.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.eventos.push(e);
    else grupos.push({ clave, etiqueta: etiquetaDia(e.fecha, ahora), eventos: [e] });
  }
  return grupos;
}

/** «3:45:12 p. m. · Ana Gómez (Vendedor) · Web · Tienda en línea». */
export function lineaQuien(e: Pick<EventoHistorialPedido, 'fecha' | 'actor' | 'origen' | 'canal'>): string {
  const partes: string[] = [];
  const hora = horaConSegundos(e.fecha);
  if (hora) partes.push(hora);
  if (e.actor && e.actor.nombre) partes.push(e.actor.rol ? `${e.actor.nombre} (${e.actor.rol})` : e.actor.nombre);
  if (e.origen) partes.push(e.origen);
  if (e.canal) partes.push(e.canal);
  return partes.join(' · ');
}

// ── La consulta al servidor ──────────────────────────────────────────────────

/**
 * Ruta de la consulta de una página del historial. Aparte del servicio para probarla sin Angular:
 * el id va codificado (no se sale de la ruta), el orden desconocido cae en `desc` y el cursor se
 * pasa tal cual lo dio el servidor.
 */
export function rutaHistorialPedido(orderId: string, consulta: ConsultaHistorialPedido = {}): string {
  const q: string[] = ['vista=eventos'];
  if (consulta.limite) q.push(`limite=${encodeURIComponent(String(consulta.limite))}`);
  q.push(`orden=${consulta.orden === 'asc' ? 'asc' : 'desc'}`);
  if (consulta.cursor) q.push(`cursor=${encodeURIComponent(consulta.cursor)}`);
  return `/v1/orders/${encodeURIComponent(orderId)}/history?${q.join('&')}`;
}
