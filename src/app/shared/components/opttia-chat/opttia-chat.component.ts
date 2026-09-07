import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  OpttiaChatMessage,
  OpttiaChatService,
  OpttiaInterrupt
} from '../../services/opttia-chat.service';

@Component({
  selector: 'app-opttia-chat',
  templateUrl: './opttia-chat.component.html',
  styleUrls: ['./opttia-chat.component.scss']
})
export class OpttiaChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;
  @Output() closeRequested = new EventEmitter<void>();

  messages: OpttiaChatMessage[] = [];
  pendingInterrupt: OpttiaInterrupt | null = null;
  draft = '';
  isSending = false;
  errorMessage: string | null = null;
  hasConsent = false;

  get suggestions(): string[] {
    return [
      { tool: 'get_sales_today', text: '¿Cómo van las ventas de hoy?' },
      { tool: 'get_low_stock_products', text: '¿Qué productos tienen bajo stock?' },
      { tool: 'get_orders', text: 'Muéstrame los pedidos pendientes' }
    ].filter(suggestion => this.opttia.hasTool(suggestion.tool)).map(suggestion => suggestion.text);
  }

  private shouldScroll = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    public readonly opttia: OpttiaChatService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.opttia.prepareForCurrentSession();
    this.hasConsent = localStorage.getItem(this.consentKey) === 'accepted';

    this.opttia.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      });

    this.opttia.sending$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isSending => {
        this.isSending = isSending;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      });

    this.opttia.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error;
        this.cdr.markForCheck();
      });

    this.opttia.interrupt$
      .pipe(takeUntil(this.destroy$))
      .subscribe(interrupt => {
        this.pendingInterrupt = interrupt;
        this.shouldScroll = true;
        this.cdr.markForCheck();
      });
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll || !this.messagesContainer) return;
    const element = this.messagesContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
    this.shouldScroll = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  acceptConsent(): void {
    localStorage.setItem(this.consentKey, 'accepted');
    this.hasConsent = true;
  }

  declineConsent(): void {
    this.closeRequested.emit();
  }

  withdrawConsent(): void {
    this.opttia.clear();
    localStorage.removeItem(this.consentKey);
    this.hasConsent = false;
  }

  async send(): Promise<void> {
    const text = this.draft.trim();
    if (!text || this.isSending || !this.hasConsent || !this.opttia.canSend) return;
    this.draft = '';
    await this.opttia.sendMessage(text);
    if (this.errorMessage) this.draft = text;
  }

  useSuggestion(suggestion: string): void {
    this.draft = suggestion;
    void this.send();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  clearConversation(): void {
    this.opttia.clear();
  }

  respond(interrupt: OpttiaInterrupt, action: string): void {
    void this.opttia.respondToInterrupt(interrupt, action);
  }

  trackMessage(_: number, message: OpttiaChatMessage): string {
    return message.id;
  }

  private get consentKey(): string {
    return this.opttia.consentStorageKey;
  }
}
