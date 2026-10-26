/**
 * Historial del producto (D-548, F1): funciones PURAS de la pantalla. Sin Angular, sin red.
 *
 *  - Todas las horas se muestran en hora de Colombia (`America/Bogota`, UTC−5, sin horario de
 *    verano), no en la del navegador: un cambio de las 10:54 a. m. dice 10:54 a. m. en cualquier
 *    computador. El servidor guarda el instante en UTC (ISO).
 *  - El día de cada evento se decide en hora de Colombia: un cambio de las 8:30 p. m. no cae en el
 *    día siguiente aunque ya sea otro día en UTC.
 *  - Pesos colombianos sin decimales y puntos de miles, como el resto de Katuq: «$42.621».
 *  - La variación lleva signo: «+$35.670, +83,7 %»; una baja usa el signo menos «−», no el guion.
 *
 * Lo prueba `tests/productos/historial-producto.util.test.js`.
 */

import {
  ConsultaHistorialProducto,
  EventoHistorialProducto,
  FotoProductoHistorial,
  PrecioHistorialProducto,
} from '../../../shared/models/historial-producto.model';
import { esFamiliaAdministrador } from '../../../shared/utils/roles';

export const ZONA_COLOMBIA = 'America/Bogota';
const MENOS = '−';
const FLECHA = '→';

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

const dd = (n: number): string => String(n).padStart(2, '0');

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
 * Fecha y hora en Colombia: «23 oct 2026, 10:54 a. m.» (el formato de Listas de precios). Se arma a
 * mano porque `toLocaleString('es-CO')` no escribe igual en todos los navegadores («23 de oct de 2026»).
 * Un valor que no es fecha se devuelve como texto.
 */
export function fechaHoraColombia(iso: any): string {
  if (iso === null || iso === undefined || iso === '') return '-';
  const p = partesColombia(iso);
  if (!p) return String(iso);
  return `${dd(p.dia)} ${MESES_CORTOS[p.mes - 1]} ${p.anio}, ${reloj(p, false)}`;
}

/** Pesos sin decimales, con puntos de miles: «$42.621». Un número negativo lleva «−». */
export function formatoCOP(valor: any): string {
  if (valor === null || valor === undefined || valor === '' || !isFinite(Number(valor))) return '';
  const n = Math.round(Number(valor));
  const texto = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? MENOS : ''}$${texto}`;
}

/** Diferencia en pesos con signo: «+$35.670» o «−$20.000». Cero es «$0». */
export function diferenciaConSigno(valor: any): string {
  if (valor === null || valor === undefined || valor === '' || !isFinite(Number(valor))) return '';
  const n = Math.round(Number(valor));
  if (n === 0) return '$0';
  return `${n > 0 ? '+' : MENOS}${formatoCOP(Math.abs(n))}`;
}

/** Porcentaje con coma decimal y signo: «+83,7 %» o «−12,5 %». */
export function porcentajeConSigno(valor: any): string {
  if (valor === null || valor === undefined || valor === '' || !isFinite(Number(valor))) return '';
  const n = Number(valor);
  const abs = Math.abs(n).toFixed(1).replace('.', ',');
  if (Number(abs.replace(',', '.')) === 0) return '0 %';
  return `${n > 0 ? '+' : MENOS}${abs} %`;
}

/** «+$35.670, +83,7 %»; sin porcentaje (el valor anterior era 0 o no había) queda solo la diferencia. */
export function variacion(diferencia: any, porcentaje: any): string {
  const d = diferenciaConSigno(diferencia);
  if (!d) return '';
  const p = porcentajeConSigno(porcentaje);
  return p ? `${d}, ${p}` : d;
}

/**
 * La línea de un precio o del costo: «$42.621 → $78.291 (+$35.670, +83,7 %)». Usa el valor con IVA
 * cuando el servidor lo manda (es el que ve la persona en la pantalla), y si no, el de sin IVA. Un
 * precio quitado dice «Sin precio».
 */
export function lineaPrecio(p: PrecioHistorialProducto): string {
  const antes = p.antesConIva !== null && p.antesConIva !== undefined ? p.antesConIva : p.antes;
  const despues = p.despuesConIva !== null && p.despuesConIva !== undefined ? p.despuesConIva : p.despues;
  const a = antes === null || antes === undefined ? 'Sin precio' : formatoCOP(antes);
  const d = despues === null || despues === undefined ? 'Sin precio' : formatoCOP(despues);
  const v = variacion(p.diferencia, p.porcentaje);
  return `${a} ${FLECHA} ${d}${v ? ` (${v})` : ''}`;
}

/** Hacia dónde fue un precio: sube, baja o igual. Sirve para el color de la pastilla. */
export function sentidoPrecio(p: PrecioHistorialProducto): 'sube' | 'baja' | 'igual' | 'cambia' {
  const d = p.diferencia;
  if (d === null || d === undefined || !isFinite(Number(d))) return 'cambia';
  return Number(d) > 0 ? 'sube' : Number(d) < 0 ? 'baja' : 'igual';
}

/** Un valor de un dato (no de plata) para mostrarlo: vacío es «Sin dato». */
export function textoValor(valor: string | number | boolean | null | undefined, clase?: string): string {
  if (valor === null || valor === undefined || valor === '') return 'Sin dato';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (clase === 'porcentaje' && isFinite(Number(valor))) return `${String(valor).replace('.', ',')} %`;
  return String(valor);
}

// ── Aspecto por tipo (D-541 D10: azulejo de 32 px con par semántico) ─────────

export interface AspectoEvento {
  /** Clase de PrimeIcons. */
  icono: string;
  /** Sufijo de la clase de color: `hp-tono--<tono>`. */
  tono: 'primario' | 'info' | 'alerta' | 'peligro' | 'exito' | 'neutro';
}

const ASPECTOS: Record<string, AspectoEvento> = {
  product_created: { icono: 'pi pi-plus', tono: 'primario' },
  product_deleted: { icono: 'pi pi-trash', tono: 'peligro' },
  cost_changed: { icono: 'pi pi-wallet', tono: 'alerta' },
  price_changed: { icono: 'pi pi-tag', tono: 'info' },
  product_deactivated: { icono: 'pi pi-ban', tono: 'peligro' },
  product_activated: { icono: 'pi pi-check-circle', tono: 'exito' },
  product_sold_out: { icono: 'pi pi-exclamation-circle', tono: 'alerta' },
  product_available: { icono: 'pi pi-check', tono: 'exito' },
  product_edited: { icono: 'pi pi-pencil', tono: 'primario' },
  photos_changed: { icono: 'pi pi-image', tono: 'neutro' },
};

export function aspectoEvento(tipo: string): AspectoEvento {
  return ASPECTOS[tipo] || { icono: 'pi pi-info-circle', tono: 'neutro' };
}

// ── Agrupar por día ──────────────────────────────────────────────────────────

export interface GrupoDia {
  clave: string;
  etiqueta: string;
  eventos: EventoHistorialProducto[];
}

/**
 * Junta los eventos por día de Colombia conservando el orden en que llegan (el servidor ya los
 * manda ordenados y una página nueva continúa donde terminó la anterior).
 */
export function agruparPorDia(eventos: EventoHistorialProducto[], ahora: Date = new Date()): GrupoDia[] {
  const grupos: GrupoDia[] = [];
  for (const e of eventos || []) {
    const clave = claveDiaColombia(e.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.eventos.push(e);
    else grupos.push({ clave, etiqueta: etiquetaDia(e.fecha, ahora), eventos: [e] });
  }
  return grupos;
}

/** «3:45:12 p. m. · Ana Gómez (Vendedor) · Katuq · Importación de precios». */
export function lineaQuien(e: EventoHistorialProducto): string {
  const partes: string[] = [];
  const hora = horaConSegundos(e.fecha);
  if (hora) partes.push(hora);
  if (e.actor && e.actor.nombre) partes.push(e.actor.rol ? `${e.actor.nombre} (${e.actor.rol})` : e.actor.nombre);
  if (e.origen) partes.push(e.origen);
  if (e.canal) partes.push(e.canal);
  return partes.join(' · ');
}

/** El resumen de un producto creado o borrado: «JCR4021 · Camisa azul · Hombre · $42.621». */
export function resumenFoto(f: FotoProductoHistorial | undefined | null): string {
  if (!f) return '';
  const partes: string[] = [];
  if (f.reference) partes.push(String(f.reference));
  if (f.name) partes.push(String(f.name));
  if (f.category) partes.push(String(f.category));
  const precio = f.basePriceWithTax !== null && f.basePriceWithTax !== undefined ? f.basePriceWithTax : f.basePrice;
  if (precio !== null && precio !== undefined) partes.push(formatoCOP(precio));
  return partes.join(' · ');
}

// ── «Última edición» del producto (listado y ficha) ─────────────────────────

const FORMA_DE_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Quién hizo la última edición: el correo si hay una persona; vacío en cualquier otro caso.
 * Los escritores del servidor dejan en `user_edit` textos técnicos que no son una persona
 * («system», «import-precios», «osmosis_sync», «flow-engine», «conector-mcp», «bot-whatsapp»,
 * «whatsapp-confirmacion», …) y la lista crece sola; por eso no se lista lo que se oculta: solo se
 * muestra lo que tiene forma de correo.
 */
export function editorDeProducto(userEdit: any): string {
  const editor = String(userEdit === null || userEdit === undefined ? '' : userEdit).trim();
  return FORMA_DE_CORREO.test(editor) ? editor : '';
}

/** Menú de «Lista de precios», donde vive la pestaña «Costo» (D9). */
export const MENU_LISTA_PRECIOS = 'lista-precios/lista-precios';

/**
 * ¿Esta sesión puede ver costos en el historial? Espejo del servidor (D9, `puedeVerCostos` de
 * `historialProducto/lectura.js`): familia Administrador, el rol que pasa `puedeVerMargen`
 * (admin, super, gerente, gerencia, dirección, líder comercial) o el menú «Lista de precios» en sus
 * rutas autorizadas. Solo decide si se OFRECE la acción «Historial» de «Costo»; el servidor sigue
 * siendo quien decide qué devuelve.
 */
export function puedeVerCostosHistorial(rol: any, rutasAutorizadas: any[] | null | undefined): boolean {
  const r = String(rol === null || rol === undefined ? '' : rol).trim();
  if (!r) return false;
  if (esFamiliaAdministrador(r)) return true;
  if (/admin|super|gerente|gerencia|direcci[oó]n|l[ií]der comercial/.test(r.toLowerCase())) return true;
  return (Array.isArray(rutasAutorizadas) ? rutasAutorizadas : []).some(
    (m) => (typeof m === 'string' ? m : m && m.path) === MENU_LISTA_PRECIOS
  );
}

// ── La consulta al servidor ──────────────────────────────────────────────────

/**
 * Ruta de la consulta de una página del historial. Aparte del servicio para probarla sin Angular:
 * el id va codificado (no se sale de la ruta), el filtro desconocido no se manda y el cursor se
 * pasa tal cual lo dio el servidor.
 */
export function rutaHistorial(productoId: string, consulta: ConsultaHistorialProducto = {}): string {
  const q: string[] = ['vista=eventos'];
  if (consulta.limite) q.push(`limite=${encodeURIComponent(String(consulta.limite))}`);
  q.push(`orden=${consulta.orden === 'asc' ? 'asc' : 'desc'}`);
  if (consulta.tipo === 'precios' || consulta.tipo === 'costo') q.push(`tipo=${consulta.tipo}`);
  if (consulta.cursor) q.push(`cursor=${encodeURIComponent(consulta.cursor)}`);
  return `/v1/productos/historial/${encodeURIComponent(productoId)}?${q.join('&')}`;
}
