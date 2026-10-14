export interface KuvoPublication {
  activo: boolean;
  slug: string;
  slugLocked: boolean;
  nombrePublico: string;
  checkoutEnabled: boolean;
  checkoutAvailable?: boolean;
  commissionPercent?: number;
  settlementFrequency?: 'weekly';
  tienda: {
    habilitada: boolean; bodegaId: string; pagoEnLinea: boolean; contraEntrega: boolean;
    envio: { modo: 'fijo' | 'zonas'; costo: number; gratisDesde: number; texto: string };
  };
}
export interface KuvoPublicationDraft {
  slug: string; slugLocked: boolean; nombrePublico: string; checkoutEnabled: boolean;
  habilitada: boolean; bodegaId: string; pagoEnLinea: boolean; contraEntrega: boolean;
  envioModo: 'fijo' | 'zonas'; envioCosto: number; envioGratisDesde: number; envioTexto: string;
}
export interface KuvoStatement {
  environment: 'production' | 'sandbox'; currency: 'COP'; commissionCents: number; settlementCadence: 'weekly';
  balanceDisplay: string; availableDisplay: string; reservedDisplay: string; paidOutDisplay: string;
  refundReservedDisplay?: string;
  capturedDisplay: string; refundedDisplay: string; heldRefundDueDisplay: string; journalCount: number;
}
export interface KuvoBankDraft {
  legalIdType: 'CC' | 'NIT' | 'PP' | 'CE' | 'TI' | 'DNI'; legalId: string; bankId: string;
  accountType: 'AHORROS' | 'CORRIENTE' | 'DEPOSITO_ELECTRONICO'; accountNumber: string; name: string; email: string;
}
export interface KuvoBankDestination {
  status: string; version: string; bankName: string; accountType: string; lastFour: string; updatedAt: string;
}
export interface KuvoBankConfiguration {
  commissionPercent: number; frequency: 'weekly'; destination: KuvoBankDestination | null;
  period: string; cutoff: string; nextRun: string; banks?: Array<{ id: string; name: string }>; banksUnavailable?: boolean;
}
export interface KuvoEnvelope<T> { success: boolean; data: T; code?: string; message?: string; }

export function publicationDraft(publication: KuvoPublication): KuvoPublicationDraft {
  const store = publication.tienda;
  return {slug: publication.slug, slugLocked: publication.slugLocked, nombrePublico: publication.nombrePublico,
    checkoutEnabled: publication.checkoutEnabled, habilitada: store.habilitada, bodegaId: store.bodegaId,
    pagoEnLinea: store.pagoEnLinea, contraEntrega: store.contraEntrega, envioModo: store.envio.modo,
    envioCosto: store.envio.costo, envioGratisDesde: store.envio.gratisDesde, envioTexto: store.envio.texto};
}
// Actualización parcial: no reenviar cupones/usos, saldo, beneficiarios ni la tienda completa.
export function publicationPatch(draft: KuvoPublicationDraft) {
  return {...(!draft.slugLocked ? {slug: draft.slug.trim()} : {}), nombrePublico: draft.nombrePublico.trim(), checkoutEnabled: draft.checkoutEnabled,
    tienda: {habilitada: draft.habilitada, bodegaId: draft.bodegaId, pagoEnLinea: draft.pagoEnLinea, contraEntrega: draft.contraEntrega,
      envio: {modo: draft.envioModo, costo: draft.envioCosto, gratisDesde: draft.envioGratisDesde, texto: draft.envioTexto.trim()}}};
}
export function bankPatch(draft: KuvoBankDraft): KuvoBankDraft {
  return {legalIdType: draft.legalIdType, legalId: draft.legalId.trim(), bankId: draft.bankId,
    accountType: draft.accountType, accountNumber: draft.accountNumber.trim(), name: draft.name.trim(), email: draft.email.trim()};
}
