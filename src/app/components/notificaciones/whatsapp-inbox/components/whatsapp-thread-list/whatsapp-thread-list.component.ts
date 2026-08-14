import { environment } from "../../../../../../environments/environment";
import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { Subject, Subscription, interval } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import {
  BotSesionResumen,
  WhatsappThread,
} from "../../models/whatsapp-thread.model";

/** Etiqueta de estado de un hilo en la lista (mockup Marketing y WhatsApp). */
interface ThreadTag {
  label: string;
  kind: "bot" | "pedido" | "cliente";
}

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
  /** Filtro activo de la lista (chips del mockup). */
  filtro: "pendientes" | "todas" | "bot" = "todas";
  selectedPhoneHash: string | null = null;
  newConversationOpen = false;

  /**
   * Sesiones del bot por hilo — para pintar la etiqueta "Respondió el
   * asistente" / "Hizo un pedido" sin tocar el endpoint de hilos.
   * Best-effort: si falla, la lista se ve como siempre.
   */
  private botPorHash = new Map<string, BotSesionResumen>();

  /** Stream de búsqueda con debounce para no disparar getThreads por cada tecla. */
  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  /** Polling cada 10s para refrescar la lista (sin spinner) con inbounds nuevos. */
  private refreshSub?: Subscription;

  constructor(private readonly inbox: WhatsappInboxService) {}

  ngOnInit(): void {
    this.searchSub = this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.fetchThreads());
    this.fetchThreads();
    this.fetchBotSesiones();
    // Polling cada 10s: refresca la lista para que aparezcan badges/preview
    // de hilos con mensajes nuevos sin necesidad de tener ese hilo abierto.
    // Solo se hace si no estás escribiendo en el buscador (para no molestar).
    // [D-117] Con la pestaña oculta NO se pollea (cada tick re-lee el universo
    // usage+inbound del comercio en Firestore); al volver, el siguiente tick
    // refresca.
    this.refreshSub = interval(10000).subscribe(() => {
      if (document.hidden) return;
      if ((this.searchQuery || "").trim().length === 0) {
        this.fetchThreadsSilent();
        this.fetchBotSesiones();
      }
    });
  }

  /** Refresca el mapa de sesiones del bot (etiquetas de la lista). */
  private fetchBotSesiones(): void {
    this.inbox.getBotSesiones().subscribe({
      next: (sesiones) => {
        const mapa = new Map<string, BotSesionResumen>();
        for (const s of sesiones || []) {
          if (s?.phoneHash) mapa.set(s.phoneHash, s);
        }
        this.botPorHash = mapa;
      },
      error: () => undefined,
    });
  }

  /**
   * Etiqueta de estado del hilo, en orden de relevancia:
   *  1. el bot ya cerró un pedido (cotización creada),
   *  2. el bot está atendiendo,
   *  3. el cliente escribió y nadie ha respondido.
   */
  tagFor(thread: WhatsappThread): ThreadTag | null {
    const sesion = this.botPorHash.get(thread.phoneHash);
    if (sesion?.cotizacionCreada?.numero) {
      return { label: "Hizo un pedido", kind: "pedido" };
    }
    if (sesion && sesion.estado === "bot") {
      return { label: "Respondió el asistente", kind: "bot" };
    }
    if (thread.unreadCount > 0) {
      return { label: "Te escribió", kind: "cliente" };
    }
    return null;
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
  }

  /**
   * Igual que fetchThreads pero sin tocar el flag `loading` ni mostrar spinner —
   * usado por el polling para refrescar en silencio. También dispara sync-inbound
   * en paralelo para que el backend pollee Kapso (defensa por si el cron del
   * backend no está corriendo).
   */
  private fetchThreadsSilent(): void {
    const userStr = localStorage.getItem("user") || "{}";
    let token = "", company = "", nit = "", email = "", authCode = "";
    try {
      const u = JSON.parse(userStr);
      token = u.token || "";
      company = u.company || "";
      nit = u.nit || "";
      email = u.email || "";
      authCode = u.authorizationCode || "";
    } catch {}
    const headers: HeadersInit = {
      "Authorization": "Bearer " + token,
      "company": company,
      "user": nit,
      "usage-code": authCode,
      "email": email,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    // Best-effort sync (ignoramos error).
    fetch(environment.urlApi + "/v1/whatsapp/sync-inbound", {
      method: "POST",
      headers,
    }).catch(() => undefined);
    // Refresh de threads.
    const qs = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : "";
    fetch(environment.urlApi + "/v1/whatsapp/conversations" + qs, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((resp: any) => {
        const items = resp?.items || [];
        if (items.length === 0) return;
        this.threads = items.map((it: any) => ({
          phoneHash: it.phoneHash,
          phoneMasked: it.phoneMasked,
          contactName: it.clienteNombre || it.profileName || "Sin nombre",
          lastMessageAt: it.lastMessageAt,
          lastMessageSnippet: it.lastMessagePreview || "",
          unreadCount: it.unreadCount || 0,
          lastDirection: it.lastMessageDirection || "outbound",
          messageCount: it.totalMessages || 0,
          flags: it.flags,
        }));
      })
      .catch(() => undefined);
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  setFiltro(filtro: "pendientes" | "todas" | "bot"): void {
    this.filtro = filtro;
  }

  /** Hilos sin responder (badge del chip "Sin responder"). */
  get pendientesCount(): number {
    return this.threads.filter((t) => t.unreadCount > 0).length;
  }

  /** Threads filtrados por el chip activo. */
  get visibleThreads(): WhatsappThread[] {
    if (this.filtro === "pendientes") {
      return this.threads.filter((t) => t.unreadCount > 0);
    }
    if (this.filtro === "bot") {
      return this.threads.filter((t) => this.botPorHash.has(t.phoneHash));
    }
    return this.threads;
  }

  /** True si al menos un hilo tiene el flag de truncamiento por retención. */
  get hasTruncatedThreads(): boolean {
    return this.threads.some((t) => !!t.flags?.inboundTruncatedAt90d);
  }

  openNewConversation(): void {
    this.newConversationOpen = true;
  }

  onNewConversationClosed(): void {
    this.newConversationOpen = false;
  }

  onNewConversationSent(_evt: { phone: string; templateName: string }): void {
    // Refresca la lista para que el outbound recién enviado aparezca como hilo.
    this.fetchThreadsSilent();
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
    const userStr = localStorage.getItem('user') || '{}';
    let token = '', company = '', nit = '', email = '', authCode = '';
    try {
      const u = JSON.parse(userStr);
      token = u.token || '';
      company = u.company || '';
      nit = u.nit || '';
      email = u.email || '';
      authCode = u.authorizationCode || '';
    } catch {}
    const headers: HeadersInit = {
      'Authorization': 'Bearer ' + token,
      'company': company,
      'user': nit,
      'usage-code': authCode,
      'email': email,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const qs = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : '';
    fetch(environment.urlApi + '/v1/whatsapp/conversations' + qs, { headers })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((resp: any) => {
        const items = resp?.items || [];
        this.threads = items.map((it: any) => ({
          phoneHash: it.phoneHash,
          phoneMasked: it.phoneMasked,
          contactName: it.clienteNombre || it.profileName || 'Sin nombre',
          lastMessageAt: it.lastMessageAt,
          lastMessageSnippet: it.lastMessagePreview || '',
          unreadCount: it.unreadCount || 0,
          lastDirection: it.lastMessageDirection || 'outbound',
          messageCount: it.totalMessages || 0,
          flags: it.flags,
        }));
        this.loading = false;
      })
      .catch((err) => {
        // Fallback al service (que cae al mock) si el endpoint falla.
        this.inbox.getThreads({ search: this.searchQuery }).subscribe({
          next: (page) => { this.threads = page.items; this.loading = false; },
          error: () => { this.threads = []; this.loading = false; },
        });
      });
  }
}
