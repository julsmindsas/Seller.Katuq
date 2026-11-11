export interface ManualInvoiceItem {
  description: string;
  reference: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent?: number;
}

export interface InvoiceConcept {
  id: string;
  description: string;
  reference: string;
  unitPrice: number;
  taxRate: number;
  source: 'saved' | 'history';
}

export interface ManualInvoice {
  customerId: string;
  billingProfile: number;
  addressIndex?: number;
  items: ManualInvoiceItem[];
  payment: { meansId: string; meansCode: string; dueDate?: string };
}

export const MAX_INVOICE_OBSERVATIONS_LENGTH = 1000;
/**
 * D-623 fase 1: la orden de compra del cliente viaja como la primera línea de las observaciones. Como las
 * observaciones, queda en el documento DIAN (el XML las escribe en `cbc:Note` y el PDF las imprime), así que el
 * comprador la ve. Lo que NO hay es un elemento propio (`OrderReference`): no cambia la estructura del XML.
 */
export const MAX_PURCHASE_ORDER_LENGTH = 50;
export const PURCHASE_ORDER_PREFIX = 'Orden de compra: ';
export const CREDIT_TERM_OPTIONS = [30, 60, 90];
export const MAX_CREDIT_DAYS = 365;
export type InvoiceSelection = ({ source: 'manual'; invoice: ManualInvoice } | { source: 'order'; orderId: string }) & {
  observations?: string;
};

export interface InvoicePreview {
  fingerprint: string;
  customerId?: string;
  orderRef?: string;
  observations?: string;
  customer: {
    name: string; documentNumber: string; email: string; dv?: string;
    address?: { line: string; city: string; department: string };
  };
  lines: { id: number; description: string; quantity: number; unitPrice: number;
    lineExtension: number; ivaPct: number; taxAmount: number; discountPercent?: number; discountAmount?: number }[];
  totals: { lineExtension: number; taxTotal: number; allowanceTotal: number; chargeTotal: number; payable: number };
  payment: { meansId: string; meansCode: string; dueDate?: string };
}

export interface InvoiceCustomer {
  id: string; name: string; documentNumber: string;
  billingProfiles: { index: number; label: string }[];
  addresses: { index: number; label: string }[];
  fiscal: { documentType: string; documentNumber: string; name: string; email: string;
    address: string; municipalityCode: string; city: string; department: string };
}

export interface InvoiceRequest {
  requestId: string;
  status: 'draft' | 'ready' | 'processing' | 'accepted' | 'rejected' | 'failed' | 'uncertain';
  source: 'manual' | 'order';
  preview: InvoicePreview;
  orderId?: string;
  invoice?: { number?: string; cufe?: string; invoiceId?: string; artifactsAvailable?: boolean;
    emailDelivery?: { requested: boolean; sent: boolean; recipient?: string; messageId?: string; error?: string } };
  delivery?: { requested: boolean; ready: boolean; message: string };
  message?: string;
  selection?: InvoiceSelection;
  version?: number;
  /** Ticket 1480: facturas aceptadas recientes del mismo cliente y valor (solo aviso). */
  posiblesDuplicados?: { number: string; issueDate: string | null; amount: number }[];
}

export interface InvoiceDraftSummary {
  requestId: string; status: 'draft' | 'ready'; title: string; updatedAt: string;
  source: 'manual' | 'order'; total: number | null;
}

export const PAYMENT_METHODS = [
  { code: '10', label: 'Efectivo' },
  { code: '42', label: 'Consignación bancaria' },
  { code: '47', label: 'Transferencia débito bancaria' },
  { code: '48', label: 'Tarjeta de crédito' },
  { code: '49', label: 'Tarjeta débito' },
];

// Mismo redondeo por línea que ublInvoiceMapper; el servidor confirma el total.
export function invoiceTotals(items: ManualInvoiceItem[]): { subtotal: number; tax: number; total: number; discount: number } {
  const round = (value: number) => Math.round(value * 100) / 100;
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  for (const item of items) {
    const gross = round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
    const reduction = round(gross * Math.min(99.99, Math.max(0, Number(item.discountPercent) || 0)) / 100);
    const base = round(gross - reduction);
    discount += reduction;
    subtotal += base;
    tax += round(base * (Number(item.taxRate) || 0) / 100);
  }
  return { subtotal: round(subtotal), tax: round(tax), total: round(subtotal + tax), discount: round(discount) };
}

/** Fecha de hoy en Colombia (UTC-5) como 'AAAA-MM-DD'; mismo criterio del servidor para «de hoy en adelante». */
export function todayInColombia(now: number = Date.now()): string {
  return new Date(now - 5 * 3600000).toISOString().slice(0, 10);
}

const DAY_MS = 86400000;
const isoDay = (date: string): number => Date.parse(date + 'T00:00:00Z');

/** Vencimiento = hoy en Colombia + `days` días. Devuelve '' si los días no son un entero de 1 a 365. */
export function dueDateFromDays(days: unknown, now: number = Date.now()): string {
  const value = typeof days === 'string' && days.trim() !== '' ? Number(days) : days;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_CREDIT_DAYS) return '';
  return new Date(isoDay(todayInColombia(now)) + value * DAY_MS).toISOString().slice(0, 10);
}

/** Días entre hoy (Colombia) y el vencimiento; null si la fecha no es válida o ya pasó. */
export function daysUntilDue(dueDate: string | null | undefined, now: number = Date.now()): number | null {
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const diff = Math.round((isoDay(dueDate) - isoDay(todayInColombia(now))) / DAY_MS);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

/** '' si la orden de compra es válida (vacía, hasta 50 caracteres, una sola línea y sin controles). */
export function purchaseOrderProblem(value: string | null | undefined): '' | 'length' | 'chars' {
  const text = String(value ?? '').trim();
  if (text.length > MAX_PURCHASE_ORDER_LENGTH) return 'length';
  // Una sola línea y texto admitido por XML 1.0, igual que las observaciones.
  return /[\u0000-\u001F\u007F]|[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(text) ? 'chars' : '';
}

/** Observaciones que viajan al servidor y al documento DIAN (nota del XML y PDF): «Orden de compra: X» arriba y el texto del comercio debajo. */
export function composeObservations(purchaseOrder: string | null | undefined, observations: string): string {
  const order = String(purchaseOrder ?? '').trim();
  const text = observations.trim();
  if (!order) return text;
  return PURCHASE_ORDER_PREFIX + order + (text ? '\n' + text : '');
}

/** Inverso de `composeObservations`: separa la primera línea «Orden de compra: X» del resto. */
export function splitObservations(composed: string | null | undefined): { purchaseOrder: string; observations: string } {
  const text = String(composed ?? '');
  const match = /^Orden de compra: ([^\n]{1,50})(?:\n([\s\S]*))?$/.exec(text);
  if (!match || purchaseOrderProblem(match[1])) return { purchaseOrder: '', observations: text };
  return { purchaseOrder: match[1].trim(), observations: match[2] ?? '' };
}

/** D-711: factura de membresía de Katuq pendiente de enviar a la DIAN (solo la ve un Super Administrador de Julsmind). */
export interface MembresiaPendiente {
  cuentaId: string;
  orderId: string | null;
  nroPedido: string | null;
  comercio: string | null;
  requestId: string | null;
  periodoVentas: { desde: string | null; hasta: string | null };
  corte: string | null;
  montoCOP: number;
  formaPago: 'contado' | 'credito' | null;
  medioPago: string | null;
  vencimiento: string | null;
  descripcion: string | null;
  observaciones: string | null;
  editada: boolean;
}

export interface MembresiaCambios {
  formaPago?: 'contado' | 'credito';
  medioPago?: string;
  vencimiento?: string | null;
  descripcion?: string;
  observaciones?: string;
}
