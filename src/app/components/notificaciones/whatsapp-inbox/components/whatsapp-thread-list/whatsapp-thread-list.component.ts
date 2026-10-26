import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { Subject, Subscription, interval } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { TranslateService } from "@ngx-translate/core";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import {
  BotSesionResumen,
  WhatsappThread,
  claveChat,
} from "../../models/whatsapp-thread.model";
import {
  LineaResumen,
  MessagingLine,
} from "../../../../../shared/services/messaging/messaging.models";

/** Etiqueta de estado de un hilo en la lista (mockup Marketing y WhatsApp). */
interface ThreadTag {
  label: string;
  kind: "bot" | "pedido" | "cliente";
}

/**
 * Listado de hilos (columna izquierda del shell).
 *
 * El componente es autosuficiente: carga sus propios datos desde
 * `WhatsappInboxService.getThreads` en `ngOnInit` y emite `threadSelected`
 * con el hilo al hacer click en un item.
 *
 * Funciones soportadas:
 *  - Búsqueda con debounce 350ms.
 *  - Filtro toggle "Solo con respuesta entrante".
 *  - [D-437] Filtro por número del comercio (solo si hay números conectados) y
 *    etiqueta del número en cada fila.
 *  - Marcado visual de leído en cliente (no espera al backend).
 *  - Banner amarillo si algún hilo tiene `flags.inboundTruncatedAt90d`.
 */
@Component({
  selector: "app-whatsapp-thread-list",
  templateUrl: "./whatsapp-thread-list.component.html",
  styleUrls: ["./whatsapp-thread-list.component.scss"],
})
export class WhatsappThreadListComponent implements OnInit, OnDestroy {
  /** [D-437] Líneas del comercio (vacío con la bandera apagada). */
  @Input() lineas: MessagingLine[] = [];
  @Input() esAdministrador = false;
  @Input() miEmail = "";
  /** [D-437] Clave (número + cliente) del chat abierto en el detalle. */
  @Input() claveSeleccion: string | null = null;

  @Output() threadSelected = new EventEmitter<WhatsappThread>();
  /** [D-437] El refresco trajo datos nuevos del chat abierto (por ejemplo, otro dueño). */
  @Output() seleccionRefrescada = new EventEmitter<WhatsappThread>();

  threads: WhatsappThread[] = [];
  loading = false;
  /** El último intento de cargar la lista falló (sin datos de demostración). */
  errorCarga = false;
  searchQuery = "";
  /** Filtro activo de la lista (chips del mockup). */
  filtro: "pendientes" | "todas" | "bot" = "todas";
  /** [D-437] Número elegido en el filtro ("" = todos). */
  lineaFiltro = "";
  newConversationOpen = false;

  /**
   * Sesiones del bot por hilo — para pintar la etiqueta "Respondió el
   * asistente" / "Hizo un pedido" sin tocar el endpoint de hilos.
   * Best-effort: si falla, la lista se ve como siempre.
   */
  private botPorHash = new Map<string, BotSesionResumen>();
  /** [D-437] Números vistos en los chats (para el filtro de quien no administra). */
  private lineasVistas = new Map<string, LineaResumen>();

  /** Stream de búsqueda con debounce para no disparar getThreads por cada tecla. */
  private readonly searchSubject = new Subject<string>();
  private searchSub?: Subscription;
  /** Polling cada 10s para refrescar la lista (sin spinner) con inbounds nuevos. */
  private refreshSub?: Subscription;
  private fetchSub?: Subscription;

  constructor(
    private readonly inbox: WhatsappInboxService,
    private readonly translate: TranslateService,
  ) {}

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
      return { label: "notificaciones.whatsapp.list.tagOrder", kind: "pedido" };
    }
    if (sesion && sesion.estado === "bot") {
      return { label: "notificaciones.whatsapp.list.tagBot", kind: "bot" };
    }
    if (thread.unreadCount > 0) {
      return { label: "notificaciones.whatsapp.list.tagCustomer", kind: "cliente" };
    }
    return null;
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
    this.fetchSub?.unsubscribe();
  }

  /**
   * Igual que fetchThreads pero sin tocar el flag `loading` ni mostrar spinner —
   * usado por el polling para refrescar en silencio. También dispara sync-inbound
   * en paralelo para que el backend pollee Kapso (defensa por si el cron del
   * backend no está corriendo).
   */
  private fetchThreadsSilent(): void {
    // Best-effort sync (el servicio ignora el error).
    this.inbox.syncInbound().subscribe();
    this.inbox
      .getThreads({ search: this.searchQuery, lineId: this.lineaFiltro || null })
      .subscribe({
        next: (page) => {
          if (page.items.length === 0) return;
          this.ponerHilos(page.items);
        },
        error: () => undefined,
      });
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  setFiltro(filtro: "pendientes" | "todas" | "bot"): void {
    this.filtro = filtro;
  }

  /** [D-437] Cambio del filtro por número: recarga desde el servidor. */
  onLineaFiltroChange(lineId: string): void {
    this.lineaFiltro = lineId || "";
    this.fetchThreads();
  }

  /**
   * [D-437] Números del filtro. La familia Administrador ve todos; los demás,
   * los que tienen asignados más los que aparecen en sus chats. Sin números,
   * no hay filtro.
   */
  get opcionesLinea(): LineaResumen[] {
    const mapa = new Map<string, LineaResumen>();
    const yo = (this.miEmail || "").toLowerCase();
    for (const l of this.lineas || []) {
      const mia = (l.sellers || []).some((s) => (s.email || "").toLowerCase() === yo);
      if (this.esAdministrador || mia) {
        mapa.set(l.id, { id: l.id, displayName: l.displayName, displayPhone: l.displayPhone });
      }
    }
    this.lineasVistas.forEach((l, id) => {
      if (!mapa.has(id)) mapa.set(id, l);
    });
    return Array.from(mapa.values());
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
    // Marcado visual de "leído" en el cliente. El backend confirma cuando se
    // abre el detalle (markThreadViewed desde thread-detail).
    if (thread.unreadCount > 0) {
      thread.unreadCount = 0;
    }
    this.threadSelected.emit(thread);
  }

  isSelected(thread: WhatsappThread): boolean {
    return this.claveSeleccion === this.claveDe(thread);
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
      return this.translate.instant('notificaciones.whatsapp.list.justNow');
    }
    const min = Math.floor(sec / 60);
    if (min < 60) {
      return this.translate.instant('notificaciones.whatsapp.list.minutesAgo', { n: min });
    }
    const hr = Math.floor(min / 60);
    if (hr < 24) {
      return this.translate.instant('notificaciones.whatsapp.list.hoursAgo', { n: hr });
    }
    const d = Math.floor(hr / 24);
    if (d < 7) {
      return this.translate.instant('notificaciones.whatsapp.list.daysAgo', { n: d });
    }
    return new Date(iso).toLocaleDateString();
  }

  /** [D-437] El mismo cliente en dos números son dos filas. */
  trackByHash(_: number, thread: WhatsappThread): string {
    return claveChat(thread.phoneHash, thread.line?.id);
  }

  fetchThreads(): void {
    this.loading = true;
    this.errorCarga = false;
    this.fetchSub?.unsubscribe();
    this.fetchSub = this.inbox
      .getThreads({ search: this.searchQuery, lineId: this.lineaFiltro || null })
      .subscribe({
        next: (page) => {
          this.ponerHilos(page.items);
          this.loading = false;
        },
        error: () => {
          this.threads = [];
          this.errorCarga = true;
          this.loading = false;
        },
      });
  }

  /** Guarda los hilos y avisa si el chat abierto cambió (por ejemplo, de dueño). */
  private ponerHilos(items: WhatsappThread[]): void {
    this.threads = items;
    for (const t of items) {
      if (t.line?.id) this.lineasVistas.set(t.line.id, t.line);
    }
    if (!this.claveSeleccion) return;
    const abierto = items.find((t) => this.claveDe(t) === this.claveSeleccion);
    if (abierto) this.seleccionRefrescada.emit(abierto);
  }

  private claveDe(thread: WhatsappThread): string {
    return claveChat(thread.phoneHash, thread.line?.id);
  }
}
