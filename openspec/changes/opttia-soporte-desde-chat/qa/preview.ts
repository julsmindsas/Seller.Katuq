import '@angular/compiler';
import 'zone.js';
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Subject } from 'rxjs';
import { OpttiaSupportTicketComponent } from '../../../../src/app/shared/components/opttia-chat/opttia-support-ticket.component';
import { OpttiaSupportView } from '../../../../src/app/shared/services/opttia-support.types';
import { OpttiaChatComponent } from '../../../../src/app/shared/components/opttia-chat/opttia-chat.component';
import { OpttiaMarkdownComponent } from '../../../../src/app/shared/components/opttia-chat/opttia-markdown.component';
import { OpttiaChatService } from '../../../../src/app/shared/services/opttia-chat.service';

const supportView = new BehaviorSubject<OpttiaSupportView | null>(null);
const fakeChat = {
  support$: supportView.asObservable(),
  messages$: new BehaviorSubject([{ id: 'welcome', role: 'assistant', createdAt: new Date(),
    content: 'Organicé tu reporte. Revísalo antes de crear el ticket.' }]).asObservable(),
  sending$: new BehaviorSubject(false).asObservable(), error$: new BehaviorSubject(null).asObservable(),
  interrupt$: new BehaviorSubject(null).asObservable(), openRequested$: new Subject<string>(),
  access$: new BehaviorSubject({ remaining: 0, limit: 10, resetTime: new Date(Date.now()+86400000).toISOString(),
    tools: ['create_support_ticket'], supportTicketCreation: true }).asObservable(),
  commerceName: 'COMERCIO DE PRUEBA', consentStorageKey: 'opttia.qa-local-consent', accessLoading: false,
  canSend: false, get supportSubmitting() { return supportView.value?.status === 'submitting'; },
  hasTool: (name: string) => name === 'create_support_ticket', takePendingDraft: () => null,
  prepareForCurrentSession() {}, refreshAccess() {}, dismissError() {}, cancel() {}, clear() { supportView.next(null); },
  confirmSupport() { supportView.next({ ...supportView.value!, status: 'submitting' });
    setTimeout(() => supportView.next({ ...supportView.value!, status: 'created',
      ticket: { id: 'fixture-ticket', nroTicket: 9876, status: 'Pendiente' } }), 600); },
  cancelSupport() { supportView.next({ status: 'cancelled', message: 'Propuesta descartada sin envío.' }); },
};

@Component({ selector: 'qa-ticket-list', template: '<h2>Mis tickets · simulación</h2><p>Ticket #9876 guardado en memoria de prueba.</p>' })
class FakeTicketList {}

@Component({ selector: 'support-preview', template: `
  <main class="qa-page">
    <p class="qa-banner">Vista local de prueba · datos ficticios · sin backend, modelo, tickets o avisos reales</p>
    <nav class="qa-states" aria-label="Estados de prueba">
      <button *ngFor="let state of states" (click)="select(state)" [attr.data-state]="state">{{state}}</button>
    </nav>
    <section class="qa-chat" aria-label="Chat de prueba">
      <app-opttia-chat></app-opttia-chat>
    </section>
    <p class="qa-trace" aria-live="polite">{{trace}}</p>
    <router-outlet></router-outlet>
  </main>` })
class Preview {
  states: OpttiaSupportView['status'][] = ['review', 'draft', 'submitting', 'created', 'existing', 'uncertain', 'expired', 'revoked'];
  view!: OpttiaSupportView;
  trace = 'Simulación lista.';
  constructor() { localStorage.setItem(fakeChat.consentStorageKey, 'accepted'); this.select('review'); }
  select(status: OpttiaSupportView['status']): void {
    this.view = { status, display: { company: 'COMERCIO DE PRUEBA', reporter: 'colaborador@ejemplo.invalid',
      asunto: 'No puedo guardar una factura',
      descripcion: 'Al guardar la factura, la pantalla muestra “No se pudo completar”.\nOcurre en Ventas y necesito que soporte revise el caso.',
      adjuntos: ['https://evidencias.example/captura-de-prueba.png'] },
      expiresAt: new Date(Date.now() + 240000).toISOString(),
      ...(['created', 'existing'].includes(status) ? { ticket: { id: 'fixture-ticket', nroTicket: 9876, status: 'Pendiente' } } : {}),
      ...(status === 'draft' ? { draft: { asunto: 'Problema al facturar', descripcion: '', adjuntos: [] }, message: '¿Qué mensaje aparece al guardar?' } : {}),
      ...(status === 'uncertain' ? { message: 'No se pudo comprobar el resultado. Reintenta la misma propuesta o revisa Mis tickets.' } : {}),
      ...(status === 'expired' ? { message: 'La propuesta venció. Si intentaste confirmar, revisa Mis tickets antes de preparar otra.' } : {}),
      ...(status === 'revoked' ? { message: 'Tu sesión o permiso cambió. Revisa tu acceso antes de preparar otra propuesta.' } : {}) };
    this.trace = 'Estado simulado: ' + status;
    supportView.next(this.view);
  }
  confirm(): void { this.select('submitting'); this.trace = 'Clic de confirmación recibido. Solo simulación.';
    setTimeout(() => { this.select('created'); this.trace = 'Resultado simulado #9876. Cero escrituras reales.'; }, 600); }
  cancel(): void { this.select('cancelled'); this.trace = 'Propuesta descartada sin envío.'; }
  reply(): void { this.trace = 'Modo de aclaración del mismo reporte. Solo datos parciales, sin historial general.'; }
}

@NgModule({ declarations: [Preview, FakeTicketList, OpttiaChatComponent, OpttiaMarkdownComponent], imports: [BrowserModule, FormsModule,
  RouterModule.forRoot([{ path: 'misTickets', component: FakeTicketList }]), OpttiaSupportTicketComponent],
  providers: [{ provide: OpttiaChatService, useValue: fakeChat }], bootstrap: [Preview] })
class PreviewModule {}
platformBrowserDynamic().bootstrapModule(PreviewModule);
