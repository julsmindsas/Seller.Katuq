import { TEXTOS } from '../plataforma.textos';
import { MedioPagoManual } from '../plataforma.tipos';
import { limpiarTextoLibre } from './cuentas';

/** D-700 18.8 — Reglas del formulario de pago manual (las mismas que valida el servidor; él decide). */
export const MEDIOS_PAGO: MedioPagoManual[] = ['transferencia', 'consignacion', 'efectivo', 'otro'];
export const MEDIOS_CON_REFERENCIA: MedioPagoManual[] = ['transferencia', 'consignacion'];
export const MOTIVO_PAGO_MIN = 20;
export const MOTIVO_PAGO_MAX = 200;
export const REFERENCIA_MAX = 60;
export const SOPORTE_MAX_BYTES = 5 * 1024 * 1024;
export const PERIODO_MAX_DIAS = 400;
const MS_DIA = 86400000;
const COLOMBIA_UTC = -5 * 3600000;

export interface FormularioPago {
  desde: string;
  hasta: string;
  fecha: string;
  monto: string;
  medio: MedioPagoManual | '';
  referencia: string;
  motivo: string;
}

/** Hoy en Colombia (UTC-5 fijo) como AAAA-MM-DD. */
export function hoyColombia(ahoraMs: number = Date.now()): string {
  return new Date(ahoraMs + COLOMBIA_UTC).toISOString().slice(0, 10);
}

export function fechaValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return false;
  const f = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(f.getTime()) && f.toISOString().slice(0, 10) === v;
}

const diasEntre = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_DIA);

/** Solo dígitos del texto escrito («300.000» → 300000). Vacío o sin dígitos → null. */
export function montoDeTexto(v: string): number | null {
  const d = (v || '').replace(/\D/g, '');
  if (!d || d.length > 11) return null;
  const n = Number(d);
  return Number.isSafeInteger(n) ? n : null;
}

/** Una referencia no puede traer 10 o más dígitos seguidos (números de tarjeta o de cuenta), ni espacios ni guiones de por medio. */
export function referenciaConNumeroLargo(v: string): boolean {
  return /\d{10,}/.test((v || '').replace(/[\s.\-_]/g, ''));
}

export type ErroresPago = Partial<Record<'periodo' | 'fecha' | 'monto' | 'medio' | 'referencia' | 'soporte', string>>;

/** Valida el formulario y el archivo escogido. Devuelve los mensajes por campo (vacío = todo bien). */
export function validarPago(f: FormularioPago, archivo: { size: number; name: string } | null, ahoraMs: number = Date.now()): ErroresPago {
  const t = TEXTOS.pagoManual.campos;
  const e: ErroresPago = {};
  const hoy = hoyColombia(ahoraMs);
  if (!fechaValida(f.desde) || !fechaValida(f.hasta)) e.periodo = t.errPeriodo;
  else if (f.desde > f.hasta) e.periodo = t.errPeriodoOrden;
  else if (diasEntre(f.desde, f.hasta) + 1 > PERIODO_MAX_DIAS) e.periodo = t.errPeriodoLargo;
  if (!fechaValida(f.fecha)) e.fecha = t.errFecha;
  else if (f.fecha > hoy) e.fecha = t.errFechaFutura;
  const m = montoDeTexto(f.monto);
  if (m === null || m < 1) e.monto = t.errMonto;
  if (!f.medio) e.medio = t.errMedio;
  const ref = limpiarTextoLibre(f.referencia);
  if (ref.length > REFERENCIA_MAX) e.referencia = t.errReferenciaLarga;
  else if (ref.includes('@')) e.referencia = t.errReferenciaCorreo;
  else if (referenciaConNumeroLargo(ref)) e.referencia = t.errReferenciaNumero;
  else if (!ref && f.medio && MEDIOS_CON_REFERENCIA.includes(f.medio as MedioPagoManual)) e.referencia = t.errReferenciaFalta;
  if (!archivo) e.soporte = t.errSoporteFalta;
  else if (archivo.size > SOPORTE_MAX_BYTES) e.soporte = t.errSoporteGrande;
  else if (archivo.size <= 0) e.soporte = t.errSoporteFalta;
  return e;
}

export function motivoConfirmacionValido(v: string): boolean {
  const t = limpiarTextoLibre(v);
  if (t.includes('@') || referenciaConNumeroLargo(t)) return false;
  return t.length >= MOTIVO_PAGO_MIN && t.length <= MOTIVO_PAGO_MAX;
}

/** Clave de idempotencia de un intento: identifica la acción de la persona, no el contenido. */
export function claveNueva(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return `pago-${c.randomUUID()}`;
  return `pago-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Texto que la persona debe escribir para confirmar una anulación. */
export const textoAnular = (id: string): string => `ANULAR ${id}`;

export interface DetalleErrorPago {
  codigo: string | null;
  datos: Record<string, any> | null;
  mensaje: string;
}

/** Mensaje para la persona a partir del error HTTP: por código conocido; nunca el cuerpo crudo del servidor. */
export function detalleErrorPago(err: unknown): DetalleErrorPago {
  const e = err as { status?: number; error?: { code?: string; datos?: Record<string, any> } } | null;
  const codigo = e && e.error && typeof e.error.code === 'string' ? e.error.code : null;
  const datos = e && e.error && e.error.datos && typeof e.error.datos === 'object' ? e.error.datos : null;
  const errores = TEXTOS.pagoManual.errores;
  if (codigo && errores[codigo]) return { codigo, datos, mensaje: errores[codigo] };
  if (e && e.status === 413) return { codigo: 'SOPORTE_MUY_GRANDE', datos, mensaje: errores['SOPORTE_MUY_GRANDE'] };
  if (e && e.status === 403) return { codigo: 'OPERADOR_REQUERIDO', datos, mensaje: errores['OPERADOR_REQUERIDO'] };
  return { codigo, datos, mensaje: TEXTOS.pagoManual.errorGeneral };
}
