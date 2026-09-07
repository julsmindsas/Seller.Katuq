/** GetStatusZip describes an upload, never the software's approval or environment. */
export type DianBatchState = 'accepted' | 'pending' | 'rejected' | 'mixed' | 'not_found' | 'unknown';

export interface DianBatchDetail {
  state: DianBatchState;
  label: string;
  documentName: string;
  code: string;
  messages: string[];
}

export interface DianBatchStatus {
  state: DianBatchState;
  title: string;
  description: string;
  alertClass: string;
  details: DianBatchDetail[];
}

const PRESENTATION: Record<DianBatchState, Omit<DianBatchStatus, 'state' | 'details'>> = {
  accepted: {
    title: 'Lote aceptado',
    description: 'La DIAN aceptó los documentos de este envío. La habilitación del software se consulta por separado en el portal DIAN.',
    alertClass: 'alert-success'
  },
  pending: {
    title: 'Lote en proceso',
    description: 'La DIAN aún no entrega el resultado final de este envío. Esto no significa que tu software esté rechazado.',
    alertClass: 'alert-info'
  },
  rejected: {
    title: 'Lote con documentos rechazados',
    description: 'La DIAN reportó errores en este envío. Revisa los detalles; este resultado no indica el estado de habilitación del software.',
    alertClass: 'alert-danger'
  },
  mixed: {
    title: 'Lote con resultados diferentes',
    description: 'No todos los documentos tienen el mismo resultado. Revisa cada respuesta de este envío.',
    alertClass: 'alert-warning'
  },
  not_found: {
    title: 'Envío no encontrado',
    description: 'La DIAN no encuentra este código de seguimiento en el ambiente consultado. Revisa el código; esto no significa que tu software esté rechazado.',
    alertClass: 'alert-warning'
  },
  unknown: {
    title: 'Sin resultado concluyente del lote',
    description: 'La respuesta no permite confirmar si este envío fue aceptado, rechazado o sigue en proceso. No se modifica la habilitación del software.',
    alertClass: 'alert-info'
  }
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function normalizeDetail(value: unknown): DianBatchDetail {
  const row = asRecord(value);
  const errors = Array.isArray(row['errorMessages'])
    ? row['errorMessages'].map(asText).filter(Boolean) : [];
  const messages = [...new Set([
    asText(row['statusDescription']), asText(row['statusMessage']), ...errors
  ].filter(Boolean))];
  const description = messages.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const code = asText(row['statusCode']);
  let state: DianBatchState = 'unknown';

  // false alone also occurs while DIAN processes an upload. It is NOT a rejection.
  if (row['isValid'] === true) state = 'accepted';
  else if (code === '66' || /trackid no existe|(?:lote|envio|zipkey|trackid) no encontrado/.test(description)) state = 'not_found';
  else if (row['isValid'] === false && (errors.length > 0 || /rechazad|documento con errores/.test(description))) state = 'rejected';
  else if (/en proceso|procesando|pendiente.*validacion/.test(description)) state = 'pending';

  const labels: Record<DianBatchState, string> = {
    accepted: 'Aceptado', pending: 'En proceso', rejected: 'Rechazado',
    mixed: 'Resultados diferentes', not_found: 'No encontrado', unknown: 'Sin resultado concluyente'
  };
  return { state, label: labels[state], documentName: asText(row['xmlFileName']), code, messages };
}

export function describeDianBatchStatus(response: unknown): DianBatchStatus {
  const envelope = asRecord(response);
  if (envelope['success'] === false) {
    return { state: 'unknown', ...PRESENTATION.unknown, details: [] };
  }
  const data = asRecord(envelope['data'] ?? response);
  const hasResults = Object.prototype.hasOwnProperty.call(data, 'responses');
  const hasDirectResult = ['isValid', 'statusCode', 'statusDescription', 'statusMessage', 'errorMessages']
    .some(key => Object.prototype.hasOwnProperty.call(data, key));
  // Prefer document responses over the aggregate flag, including an empty array.
  const rows = hasResults ? (Array.isArray(data['responses']) ? data['responses'] as unknown[] : [])
    : hasDirectResult ? [data] : [];
  const details = rows.map(normalizeDetail);
  const states = new Set(details.map(detail => detail.state));
  const state: DianBatchState = details.length === 0 ? 'unknown'
    : states.size === 1 ? details[0].state : 'mixed';
  return { state, ...PRESENTATION[state], details };
}
