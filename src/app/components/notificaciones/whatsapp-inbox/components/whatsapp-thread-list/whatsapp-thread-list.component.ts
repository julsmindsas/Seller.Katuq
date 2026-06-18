import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import { WhatsappThread } from "../../models/whatsapp-thread.model";

/**
 * Listado de hilos (columna izquierda del shell).
 *
 * El componente es autosuficiente: carga sus propios datos desde
 * `WhatsappInboxService.getThreads({})` en `ngOnInit` y emite `threadSelected`
 * con el `phoneHash` al hacer click en un item.
 *
 * Funciones soportadas:
 *  - Búsqueda con debounce 350ms.
 *  - Filtro toggle "Solo con respuesta entrante".
 *  - Marcado visual de leído en cliente (no espera al backend).
 *  - Banner amarillo si algún hilo tiene `flags.inboundTruncatedAt90d`.
 */
@Component({
  selector: "app-whatsapp-thread-list",
  templateUrl: "./whatsapp-thread-list.component.html",
  styleUrls: ["./whatsapp-thread-list.component.scss"],
})
export class WhatsappThreadListComponent implements OnInit, OnDestroy {
  @Output() threadSelected = new EventEmitter<string>();

  threads: WhatsappThread[] = [];
  loading = false;
  searchQuery = "";
  onlyInbound = false;
  selectedPhoneHash: string | null = null;

  /** Stream de búsqueda con debounce para no disparar getThreads por cada tecla. */
  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  constructor(private readonly inbox: WhatsappInboxService) {}

  ngOnInit(): void {
    this.searchSub = this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.fetchThreads());
    this.fetchThreads();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  toggleInboundFilter(): void {
    this.onlyInbound = !this.onlyInbound;
  }

  /** Threads filtrados por el toggle de "solo con respuesta entrante". */
  get visibleThreads(): WhatsappThread[] {
    if (!this.onlyInbound) {
      return this.threads;
    }
    return this.threads.filter((t) => t.lastDirection === "inbound");
  }

  /** True si al menos un hilo tiene el flag de truncamiento por retención. */
  get hasTruncatedThreads(): boolean {
    return this.threads.some((t) => !!t.flags?.inboundTruncatedAt90d);
  }

  onSelect(thread: WhatsappThread): void {
    this.selectedPhoneHash = thread.phoneHash;
    // Marcado visual de "leído" en el cliente. El backend confirma cuando se
    // abre el detalle (markThreadViewed desde thread-detail).
    if (thread.unreadCount > 0) {
      thread.unreadCount = 0;
    }
    this.threadSelected.emit(thread.phoneHash);
  }

  /** Texto enmascarado del snippet (máx 60 chars). */
  truncateSnippet(snippet: string): string {
    if (!snippet) {
      return "";
    }
    return snippet.length > 60 ? snippet.slice(0, 60) + "…" : snippet;
  }

  /** Iniciales para avatar. */
  initialsFor(name: string): string {
    if (!name) {
      return "?";
    }
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }

  /**
   * Formato relativo simple (sin moment/luxon).
   *   <60s         → "hace un momento"
   *   <60min       → "hace Xm"
   *   <24h         → "hace Xh"
   *   <7d          → "hace Xd"
   *   otherwise    → fecha local corta.
   */
  formatRelative(iso: string): string {
    if (!iso) {
      return "";
    }
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) {
      return iso;
    }
    const diffMs = Date.now() - then;
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) {
      return "hace un momento";
    }
    const min = Math.floor(sec / 60);
    if (min < 60) {
      return `hace ${min}m`;
    }
    const hr = Math.floor(min / 60);
    if (hr < 24) {
      return `hace ${hr}h`;
    }
    const d = Math.floor(hr / 24);
    if (d < 7) {
      return `hace ${d}d`;
    }
    return new Date(iso).toLocaleDateString();
  }

  trackByHash(_: number, thread: WhatsappThread): string {
    return thread.phoneHash;
  }

  private fetchThreads(): void {
    this.loading = true;
    this.inbox.getThreads({ search: this.searchQuery }).subscribe({
      next: (page) => {
        this.threads = page.items;
        this.loading = false;
      },
      error: () => {
        this.threads = [];
        this.loading = false;
      },
    });
  }
}
