import { BehaviorSubject } from 'rxjs';
import { KatuqCommerceContext } from './security/katuq-commerce-context.service';
import { OpttiaSupportConfirmationService } from './opttia-support-confirmation.service';
import { OpttiaSupportDraft, OpttiaSupportProposal, OpttiaSupportView,
  parseSupportDraft, parseSupportProposal, parseSupportResult } from './opttia-support.types';

/** Estado efímero del reporte: la vista nunca recibe la capacidad de confirmar. */
export class OpttiaSupportState {
  private readonly subject = new BehaviorSubject<OpttiaSupportView | null>(null);
  readonly view$ = this.subject.asObservable();
  private proposal: OpttiaSupportProposal | null = null;
  private scope: string | null = null;
  private generation = 0;
  private enabled = false;
  private expiryTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly confirmation: Pick<OpttiaSupportConfirmationService, 'confirm'>,
    private readonly session: () => KatuqCommerceContext | null, private readonly consent: () => boolean) {}

  get submitting(): boolean { return this.subject.value?.status === 'submitting'; }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.proposal && !this.submitting) this.invalidate('revoked');
  }

  synchronize(session: KatuqCommerceContext | null): void {
    if (this.scope && (!session || this.scope !== this.fingerprint(session))) this.reset();
  }

  receive(type: string, input: unknown): void {
    const session = this.session();
    this.synchronize(session);
    if (!session || !this.enabled || !this.consent() || this.submitting) return;
    if (type === 'katuq:SUPPORT_PROPOSAL') {
      const card = parseSupportProposal(input, session.companyId, session.email || '');
      if (!card) return;
      this.reset();
      this.scope = this.fingerprint(session);
      this.proposal = card;
      this.subject.next({ status: 'review', display: card.display, expiresAt: card.expiresAt });
      this.armExpiration();
    } else if (type === 'katuq:SUPPORT_DRAFT') {
      const draft = parseSupportDraft(input);
      if (!draft) return;
      this.reset(); this.scope = this.fingerprint(session);
      this.subject.next({ status: 'draft', draft, message: 'Falta completar el reporte. Todavía no se creó un ticket.' });
    } else if (type === 'katuq:SUPPORT_RESULT') {
      const result = parseSupportResult(input);
      // El agente solo puede preparar o encontrar uno existente; crear exige clic.
      if (!result || result.status !== 'ya_existia') return;
      this.reset(); this.scope = this.fingerprint(session);
      this.subject.next({ status: 'existing', ticket: result.ticket });
    }
  }

  takeDraft(continueReport: boolean): OpttiaSupportDraft | null {
    this.synchronize(this.session());
    const draft = continueReport && this.enabled && this.subject.value?.status === 'draft' ? this.subject.value.draft : null;
    this.reset();
    return draft ? { ...draft, adjuntos: [...draft.adjuntos] } : null;
  }

  async confirm(): Promise<void> {
    const current = this.subject.value, proposal = this.proposal;
    if (!proposal || !current || !['review', 'uncertain'].includes(current.status)) return;
    const session = this.session();
    if (!session || this.scope !== this.fingerprint(session) || !this.enabled || !this.consent()) {
      this.invalidate('revoked'); return;
    }
    if (Date.parse(proposal.expiresAt) <= Date.now()) { this.invalidate('expired'); return; }
    const generation = ++this.generation;
    this.subject.next({ ...current, status: 'submitting', message: 'Confirmando el reporte…' });
    try {
      const raw = await this.confirmation.confirm(proposal);
      if (generation !== this.generation) return;
      const fresh = this.session();
      if (!fresh || this.scope !== this.fingerprint(fresh) || !this.consent()) { this.reset(); return; }
      const result = parseSupportResult(raw);
      if (!result) throw new Error('Resultado no verificable');
      this.dropCapability();
      this.subject.next({ ...current, status: result.status === 'abierto' ? 'created' : 'existing', ticket: result.ticket });
    } catch (error: any) {
      if (generation !== this.generation) return;
      const fresh = this.session();
      if (!fresh || this.scope !== this.fingerprint(fresh) || !this.consent()) { this.reset(); return; }
      if (error?.state === 'revoked') { this.invalidate('revoked'); return; }
      this.subject.next({ ...current, status: 'uncertain',
        message: 'No se pudo comprobar el resultado. No abras otro reporte: reintenta esta misma propuesta o revisa Mis tickets.' });
      this.armExpiration();
    }
  }

  cancel(): void {
    if (!['draft', 'review'].includes(this.subject.value?.status || '')) return;
    const current = this.subject.value;
    this.dropCapability(); this.generation++;
    this.subject.next({ ...current, status: 'cancelled', message: 'Propuesta descartada. No se envió una creación de ticket.' });
  }

  reset(): void {
    this.dropCapability(); this.generation++; this.scope = null; this.subject.next(null);
  }

  private invalidate(status: 'expired' | 'revoked'): void {
    const current = this.subject.value;
    this.dropCapability(); this.generation++;
    this.subject.next({ ...current, status, message: status === 'expired'
      ? 'La propuesta venció. Si ya intentaste confirmar, revisa Mis tickets antes de preparar otra.'
      : 'Tu acceso o sesión cambió. Revisa Mis tickets si habías intentado confirmar y prepara una nueva propuesta.' });
  }

  private armExpiration(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (!this.proposal) return;
    const remaining = Date.parse(this.proposal.expiresAt) - Date.now();
    if (remaining <= 0) { this.invalidate('expired'); return; }
    this.expiryTimer = setTimeout(() => {
      // Vencer o cerrar una petición enviada no deshace su escritura.
      if (!this.submitting && this.proposal) this.invalidate('expired');
    }, remaining);
  }

  private dropCapability(): void {
    this.proposal = null;
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
  }

  private fingerprint(session: KatuqCommerceContext): string {
    return JSON.stringify([session.companyId, session.email || session.userNit, session.token]);
  }
}
