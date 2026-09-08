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
