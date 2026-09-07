import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  KatuqCommerceContext,
  KatuqCommerceContextService
} from './security/katuq-commerce-context.service';

export type OpttiaMessageRole = 'user' | 'assistant';

export interface OpttiaChatMessage {
  id: string;
  role: OpttiaMessageRole;
  content: string;
  createdAt: Date;
  remoteId?: string;
  includeInContext?: boolean;
}

export interface OpttiaInterruptAction {
  id: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface OpttiaInterrupt {
  id: string;
  title: string;
  message: string;
  resumeToken?: string;
  actions: OpttiaInterruptAction[];
}

interface OpttiaSseEvent {
  type?: string;
  customType?: string;
  threadId?: string;
  session_id?: string;
  messageId?: string;
  delta?: unknown;
  message?: string;
  details?: string;
  id?: string;
  interruptId?: string;
  title?: string;
  resumeToken?: string;
  actions?: OpttiaInterruptAction[];
}

/**
 * Cliente web de Opttia (SupplyKai) para el botón flotante global.
 *
 * Se usa `fetch` porque Angular 14/HttpClient no expone el cuerpo incremental
 * de una respuesta POST SSE. Por la misma razón, los encabezados que normalmente
 * añade HttpInterceptor2 se construyen aquí, dentro del servicio y nunca en el
 * componente.
 */
@Injectable({ providedIn: 'root' })
export class OpttiaChatService implements OnDestroy {
  private readonly endpoint = `${(
    (environment as typeof environment & { opttiaApi?: string }).opttiaApi
    || 'https://back.katuq.com/adk'
  ).replace(/\/$/, '')}/agui/v2`;
  private readonly initialMessage: OpttiaChatMessage = {
    id: 'opttia-welcome',
    role: 'assistant',
    content: '¡Hola! Soy Opttia. Puedo consultar ventas, pedidos, inventario y la operación de tu empresa en Katuq. ¿Qué quieres saber?',
    createdAt: new Date(),
    includeInContext: false
  };

  private readonly messagesSubject = new BehaviorSubject<OpttiaChatMessage[]>([
    this.initialMessage
  ]);
  private readonly sendingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly interruptSubject = new BehaviorSubject<OpttiaInterrupt | null>(null);

  readonly messages$ = this.messagesSubject.asObservable();
  readonly sending$ = this.sendingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly interrupt$ = this.interruptSubject.asObservable();

  private abortController: AbortController | null = null;
  private sessionId: string | null = null;
  private activeSessionScope: string | null = null;

  get isSending(): boolean {
    return this.sendingSubject.value;
  }

  get companyId(): string | null {
    return this.readSession()?.companyId || null;
  }

  get commerceName(): string {
    return this.readSession()?.displayName || 'Datos de Katuq';
  }

  get consentStorageKey(): string {
    const session = this.readSession();
    const scope = session
      ? [session.companyId, session.email || session.userNit || 'user'].map(encodeURIComponent).join('.')
      : 'unknown';
    return `opttia.aiDataSharingConsent.v1.${scope}`;
  }

  constructor(
    private readonly ngZone: NgZone,
    private readonly commerceContext: KatuqCommerceContextService
  ) {}

  /** Evita mostrar por un instante la conversación de otra sesión del navegador. */
  prepareForCurrentSession(): void {
    const session = this.readSession();
    if (session) this.ensureSessionScope(session);
  }

  async sendMessage(content: string): Promise<void> {
    const text = content.trim();
    if (!text || this.isSending) return;

    const session = this.readSession();
    if (!session) {
      this.errorSubject.next('Tu sesión de Katuq no está disponible. Vuelve a iniciar sesión.');
      return;
    }
    this.ensureSessionScope(session);
    this.errorSubject.next(null);
    this.interruptSubject.next(null);

    this.addMessage({
      id: this.generateId('user'),
      role: 'user',
      content: text,
      createdAt: new Date()
    });

    const body = {
      company: session.companyId,
      messages: this.messagesSubject.value
        .filter(message => message.includeInContext !== false)
        .map(message => ({ role: message.role, content: message.content })),
      session_id: this.sessionId || undefined,
      capabilities: {
        a2ui: false,
        catalogs: [],
        interrupts: true
      }
    };

    const requestController = new AbortController();
    this.abortController = requestController;
    this.sendingSubject.next(true);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.buildHeaders(session, 'text/event-stream'),
        body: JSON.stringify(body),
        signal: requestController.signal
      });

      if (!response.ok) {
        throw new Error(await this.readHttpError(response));
      }

      if (!response.body) {
        throw new Error('Opttia respondió sin contenido. Intenta nuevamente.');
      }

      await this.consumeEventStream(response.body);
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        this.errorSubject.next(
          error?.message || 'No fue posible conectar con Opttia. Intenta nuevamente.'
        );
      }
    } finally {
      // Si el usuario canceló y ya inició otra pregunta, este request anterior
      // no puede apagar ni soltar el controlador de la conversación nueva.
      if (this.abortController === requestController) {
        this.sendingSubject.next(false);
        this.abortController = null;
      }
    }
  }

  async respondToInterrupt(interrupt: OpttiaInterrupt, action: string): Promise<void> {
    if (!interrupt.resumeToken || !this.sessionId) {
      this.errorSubject.next('Esta acción debe confirmarse desde la aplicación web de Opttia.');
      return;
    }

    const session = this.readSession();
    if (!session) {
      this.errorSubject.next('Tu sesión de Katuq no está disponible. Vuelve a iniciar sesión.');
      return;
    }
    this.ensureSessionScope(session);
    this.sendingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const response = await fetch(`${this.endpoint}/interrupt`, {
        method: 'POST',
        headers: this.buildHeaders(session, 'application/json'),
        body: JSON.stringify({
          company: session.companyId,
          session_id: this.sessionId,
          interrupt_id: interrupt.id,
          resume_token: interrupt.resumeToken,
          action
        })
      });

      if (!response.ok) {
        throw new Error(await this.readHttpError(response));
      }

      this.interruptSubject.next(null);
      this.addMessage({
        id: this.generateId('assistant'),
        role: 'assistant',
        content: action === 'reject'
          ? 'Acción cancelada. No hice cambios en Katuq.'
          : 'Confirmación enviada. Opttia continuará con la acción autorizada.',
        createdAt: new Date(),
        includeInContext: false
      });
    } catch (error: any) {
      this.errorSubject.next(error?.message || 'No fue posible enviar la confirmación.');
    } finally {
      this.sendingSubject.next(false);
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.sendingSubject.next(false);
  }

  clear(): void {
    this.cancel();
    this.sessionId = null;
    this.interruptSubject.next(null);
    this.errorSubject.next(null);
    this.messagesSubject.next([{ ...this.initialMessage, createdAt: new Date() }]);
  }

  dismissError(): void {
    this.errorSubject.next(null);
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private async consumeEventStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const lines = buffer.split(/\r?\n/);
      buffer = done ? '' : (lines.pop() || '');

      for (const line of lines) {
        this.processSseLine(line);
      }

      if (done) {
        if (buffer.trim()) this.processSseLine(buffer);
        break;
      }
    }
  }

  private processSseLine(line: string): void {
    if (!line.startsWith('data:')) return;

    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') return;

    try {
      this.ngZone.run(() => this.handleEvent(JSON.parse(raw) as OpttiaSseEvent));
    } catch {
      // Un evento parcial o no textual no debe derribar toda la conversación.
    }
  }

  private handleEvent(event: OpttiaSseEvent): void {
    const type = event.customType || event.type;

    switch (type) {
      case 'RUN_STARTED':
        this.sessionId = event.threadId || event.session_id || this.sessionId;
        break;

      case 'TEXT_MESSAGE_START':
        if (event.messageId) this.startAssistantMessage(event.messageId);
        break;

      case 'TEXT_MESSAGE_CONTENT':
        if (event.messageId && typeof event.delta === 'string') {
          this.appendAssistantText(event.messageId, event.delta);
        }
        break;

      case 'TEXT_MESSAGE_END':
        this.removeEmptyAssistantMessage(event.messageId);
        break;

      case 'katuq:FINAL_RESPONSE':
        if (event.message && !this.hasAssistantText(event.message)) {
          this.addMessage({
            id: event.messageId || this.generateId('assistant'),
            role: 'assistant',
            content: event.message,
            createdAt: new Date(),
            remoteId: event.messageId
          });
        }
        break;

      case 'INTERRUPT':
        this.handleInterrupt(event);
        break;

      case 'RUN_ERROR':
        this.errorSubject.next(
          event.message || event.details || 'Opttia no pudo completar la consulta.'
        );
        break;
    }
  }

  private handleInterrupt(event: OpttiaSseEvent): void {
    const actions = Array.isArray(event.actions) && event.actions.length
      ? event.actions
      : [
          { id: 'approve', label: 'Confirmar', variant: 'primary' as const },
          { id: 'reject', label: 'Cancelar', variant: 'secondary' as const }
        ];

    this.interruptSubject.next({
      id: event.interruptId || event.id || this.generateId('interrupt'),
      title: event.title || 'Confirmación requerida',
      message: event.message || event.details || 'Opttia necesita tu autorización para continuar.',
      resumeToken: event.resumeToken,
      actions
    });
  }

  private startAssistantMessage(remoteId: string): void {
    if (this.messagesSubject.value.some(message => message.remoteId === remoteId)) return;

    this.addMessage({
      id: this.generateId('assistant'),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
      remoteId
    });
  }

  private appendAssistantText(remoteId: string, delta: string): void {
    const messages = [...this.messagesSubject.value];
    let index = messages.findIndex(message => message.remoteId === remoteId);

    if (index < 0) {
      this.startAssistantMessage(remoteId);
      index = this.messagesSubject.value.findIndex(message => message.remoteId === remoteId);
      if (index < 0) return;
      messages.splice(0, messages.length, ...this.messagesSubject.value);
    }

    messages[index] = {
      ...messages[index],
      content: `${messages[index].content}${delta}`
    };
    this.messagesSubject.next(messages);
  }

  private removeEmptyAssistantMessage(remoteId?: string): void {
    if (!remoteId) return;
    const messages = this.messagesSubject.value.filter(message =>
      message.remoteId !== remoteId || message.content.trim().length > 0
    );
    this.messagesSubject.next(messages);
  }

  private hasAssistantText(content: string): boolean {
    return this.messagesSubject.value.some(message =>
      message.role === 'assistant' && message.content.trim() === content.trim()
    );
  }

  private addMessage(message: OpttiaChatMessage): void {
    this.messagesSubject.next([...this.messagesSubject.value, message]);
  }

  private ensureSessionScope(session: KatuqCommerceContext): void {
    const scope = `${session.companyId}|${session.email || session.userNit || 'user'}`;
    if (this.activeSessionScope && this.activeSessionScope !== scope) {
      this.clear();
    }
    this.activeSessionScope = scope;
  }

  private readSession(): KatuqCommerceContext | null {
    return this.commerceContext.resolve();
  }

  private buildHeaders(session: KatuqCommerceContext, accept: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': accept,
      'Authorization': `Bearer ${session.token}`,
      'company': session.companyId
    };

    if (session.userNit) headers['user'] = session.userNit;
    if (session.usageCode) headers['usage-code'] = session.usageCode;
    if (session.email) headers['email'] = session.email;
    return headers;
  }

  private async readHttpError(response: Response): Promise<string> {
    let message = '';
    try {
      const body = (await response.json()) as { message?: string; error?: string; detail?: string };
      message = body.message || body.error || body.detail || '';
    } catch {
      // El status conserva un diagnóstico útil si el backend no devuelve JSON.
    }

    if (response.status === 401) {
      return message || 'Opttia no aceptó la sesión actual. Vuelve a iniciar sesión.';
    }
    if (response.status === 403) {
      return message || 'Tu usuario no tiene permiso para usar esta función de Opttia.';
    }
    return message || `Opttia no está disponible en este momento (HTTP ${response.status}).`;
  }

  private generateId(prefix: string): string {
    const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${random}`;
  }
}
