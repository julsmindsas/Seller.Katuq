export interface OpttiaSupportDraft {
  asunto: string;
  descripcion: string;
  adjuntos: string[];
}

export interface OpttiaSupportProposal {
  version: 1;
  proposalId: string;
  expiresAt: string;
  confirmationToken: string;
  display: OpttiaSupportDraft & { company: string; reporter: string };
}

export interface OpttiaSupportResult {
  success: true;
  status: 'abierto' | 'ya_existia';
  ticket: { id: string; nroTicket: number; status: string };
}

/** Vista sin capacidades privadas: puede enlazarse a componentes, nunca incluye el sobre. */
export interface OpttiaSupportView {
  status: 'draft' | 'review' | 'submitting' | 'created' | 'existing' | 'uncertain' | 'cancelled' | 'expired' | 'revoked';
  display?: OpttiaSupportProposal['display'];
  draft?: OpttiaSupportDraft;
  expiresAt?: string;
  ticket?: OpttiaSupportResult['ticket'];
  message?: string;
}

export function parseSupportDraft(input: unknown): OpttiaSupportDraft | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['asunto', 'descripcion', 'adjuntos'].includes(key))) return null;
  if (typeof value.asunto !== 'string' || value.asunto.length > 200 || typeof value.descripcion !== 'string'
    || value.descripcion.length > 4000 || !Array.isArray(value.adjuntos) || value.adjuntos.length > 10) return null;
  if (value.adjuntos.some(url => {
    if (typeof url !== 'string' || url.length > 2048 || /[\x00-\x20\x7f]/.test(url)) return true;
    try { const parsed = new URL(url); return !['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname; }
    catch { return true; }
  })) return null;
  return { asunto: value.asunto, descripcion: value.descripcion, adjuntos: [...value.adjuntos] as string[] };
}

export function parseSupportProposal(input: unknown, company: string, reporter: string): OpttiaSupportProposal | null {
  if (!input || typeof input !== 'object') return null;
  const card = input as OpttiaSupportProposal;
  const display = card.display;
  if (card.version !== 1 || typeof card.proposalId !== 'string' || !/^[a-f0-9]{32}$/.test(card.proposalId)
    || typeof card.confirmationToken !== 'string' || !card.confirmationToken || card.confirmationToken.length > 16384
    || typeof card.expiresAt !== 'string' || !Number.isFinite(Date.parse(card.expiresAt))
    || Date.parse(card.expiresAt) <= Date.now() || Date.parse(card.expiresAt) > Date.now() + 305000
    || !display || display.company !== company || typeof display.reporter !== 'string'
    || display.reporter.toLowerCase() !== reporter.toLowerCase()) return null;
  const draft = parseSupportDraft({ asunto: display.asunto, descripcion: display.descripcion, adjuntos: display.adjuntos });
  if (!draft?.asunto.trim() || !draft.descripcion.trim()) return null;
  return { version: 1, proposalId: card.proposalId, expiresAt: card.expiresAt,
    confirmationToken: card.confirmationToken, display: { company, reporter: display.reporter, ...draft } };
}

export function parseSupportResult(input: unknown): OpttiaSupportResult | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as OpttiaSupportResult;
  if (value.success !== true || !['abierto', 'ya_existia'].includes(value.status) || !value.ticket
    || typeof value.ticket.id !== 'string' || !value.ticket.id || !Number.isSafeInteger(value.ticket.nroTicket)
    || value.ticket.nroTicket <= 0 || typeof value.ticket.status !== 'string') return null;
  return { success: true, status: value.status,
    ticket: { id: value.ticket.id, nroTicket: value.ticket.nroTicket, status: value.ticket.status } };
}
