import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
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
import { textoHumanoDePlantilla } from "./plantillas-humanas";
import { inicialesDe } from "../../../inbox-core/iniciales";
import { SONDEO_RESPALDO_MS } from "../../../../../shared/services/messaging/bandeja-en-vivo.service";

/** Chats por página del servidor (su valor por defecto) y tope que acepta en una sola petición. */
const POR_PAGINA = 20;
const TOPE_POR_PETICION = 100;

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
 *  - «Ver más conversaciones»: trae la página siguiente (antes solo se veían
 *    las 20 más recientes). El refresco pide de una vez lo ya cargado.
 */
@Component({
  selector: "app-whatsapp-thread-list",
  templateUrl: "./whatsapp-thread-list.component.html",
  styleUrls: ["./whatsapp-thread-list.component.scss"],
})
export class WhatsappThreadListComponent implements OnInit, OnChanges, OnDestroy {
  /** [D-437] Líneas del comercio (vacío con la bandera apagada). */
  @Input() lineas: MessagingLine[] = [];
  @Input() esAdministrador = false;
  @Input() miEmail = "";
  /** [D-437] Clave (número + cliente) del chat abierto en el detalle. */
  @Input() claveSeleccion: string | null = null;
  /** Canal en vivo conectado (lo dice quien aloja): el sondeo baja a uno lento de respaldo. */
  @Input() enVivo = false;
  /** Cada cambio pide refrescar ya la lista en silencio (llegó un evento de WhatsApp). */
  @Input() senalRefresco = 0;

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
  /** Refresco en silencio en curso y si otro quedó pedido mientras tanto (no se cancelan entre sí). */
  private silentSub?: Subscription;
  private silentPendiente = false;
  /** Cuándo se pidió la lista por última vez (para el sondeo lento con el canal en vivo). */
  private ultimoRefresco = 0;
  /** Cuándo se pidió por última vez la sincronización con Kapso (con el canal en vivo, solo en el sondeo lento). */
  private ultimoSync = 0;

  /** Páginas cargadas con «Ver más» (1 = solo la primera). */
  private paginas = 1;
  /** El servidor dijo que hay más chats que los cargados. */
  hayMas = false;
  cargandoMas = false;
  errorMas = false;
  private masSub?: Subscription;

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
      // Con el canal en vivo conectado este sondeo queda de respaldo (como mucho cada 30 s), salvo que la lista
      // tenga chats del número compartido de Katuq: esos no tienen hilo y no producen eventos.
      if (this.enVivo && this.todosConHilo() && Date.now() - this.ultimoRefresco < SONDEO_RESPALDO_MS) return;
      if ((this.searchQuery || "").trim().length === 0) {
        // La sincronización con Kapso va en cada vuelta solo con el canal caído; conectado, cada 30 s como mucho.
        const conSync = !this.enVivo || Date.now() - this.ultimoSync >= SONDEO_RESPALDO_MS;
        this.fetchThreadsSilent(conSync);
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

  /**
   * ¿Todos los chats de la lista van por una línea propia con su hilo? Solo esos llegan por el canal en vivo.
   * Sin la bandera de varios números el servidor no manda línea y la respuesta es no: el sondeo sigue igual.
   */
  private todosConHilo(): boolean {
    return this.threads.length > 0 && this.threads.every((t) => !!t.line?.id && !!t.threadId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Evento en vivo: la lista se relee ya, con la misma regla del sondeo (no mientras se busca). El evento ya
    // dice que el mensaje está guardado, así que no se pide la sincronización con Kapso.
    if (changes["senalRefresco"] && !changes["senalRefresco"].firstChange) {
      if ((this.searchQuery || "").trim().length === 0 && !this.loading) {
        this.fetchThreadsSilent(false);
        this.fetchBotSesiones();
      }
    }
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
    this.fetchSub?.unsubscribe();
    this.silentSub?.unsubscribe();
    this.masSub?.unsubscribe();
  }

  /**
   * Igual que fetchThreads pero sin tocar el flag `loading` ni mostrar spinner —
   * usado por el polling para refrescar en silencio. También dispara sync-inbound
   * en paralelo para que el backend pollee Kapso (defensa por si el cron del
   * backend no está corriendo).
   */
  private fetchThreadsSilent(conSync = true): void {
    this.ultimoRefresco = Date.now();
    // Uno a la vez: si ya va uno en camino, se pide otro al terminar (así una ráfaga no los cancela todos).
    if (this.silentSub && !this.silentSub.closed) {
      this.silentPendiente = true;
      return;
    }
    // Best-effort sync (el servicio ignora el error).
    if (conSync) {
      this.ultimoSync = Date.now();
      this.inbox.syncInbound().subscribe();
    }
    const siguiente = () => {
      this.silentSub = undefined;
      if (!this.silentPendiente) return;
      this.silentPendiente = false;
      this.fetchThreadsSilent(false);
    };
    // Con páginas de «Ver más», una sola petición trae todo lo cargado (hasta el tope del servidor).
    const tamano = Math.min(TOPE_POR_PETICION, this.paginas * POR_PAGINA);
    this.silentSub = this.inbox
      .getThreads({
        search: this.searchQuery,
        lineId: this.lineaFiltro || null,
        ...(this.paginas > 1 ? { pageSize: tamano } : {}),
      })
      .subscribe({
        next: (page) => {
          if (page.items.length === 0) return;
          this.ponerHilos(this.conservarResto(page.items, tamano));
          if (this.paginas * POR_PAGINA <= TOPE_POR_PETICION) this.hayMas = !!page.hasMore;
        },
        error: () => siguiente(),
        complete: () => siguiente(),
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

  /** Hilos con mensajes sin leer (badge del chip «No leídos»). */
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

  /** Texto enmascarado del snippet (máx 60 chars), con las plantillas y los tipos internos en palabras. */
  truncateSnippet(snippet: string): string {
    if (!snippet) {
      return "";
    }
    snippet = textoHumanoDePlantilla(snippet, (clave) => this.translate.instant(clave));
    return snippet.length > 60 ? snippet.slice(0, 60) + "…" : snippet;
  }

  /** Iniciales para avatar; vacío = la vista pone el ícono de persona (contacto sin nombre). */
  initialsFor(name: string): string {
    return inicialesDe(name);
  }

  /** Título de la fila: el nombre o, sin nombre, el número enmascarado (nunca varias filas «Sin nombre»). */
  nombreDe(thread: WhatsappThread): string {
    return (thread.contactName || "").trim() || thread.phoneMasked || this.translate.instant("notificaciones.sinNombre");
  }

  /** «Ver más conversaciones»: trae la página siguiente y la suma al final, sin repetir chats. */
  verMas(): void {
    if (this.cargandoMas || !this.hayMas) return;
    this.cargandoMas = true;
    this.errorMas = false;
    const pagina = this.paginas + 1;
    const filtros = `${this.searchQuery}|${this.lineaFiltro}`;
    this.masSub?.unsubscribe();
    this.masSub = this.inbox
      .getThreads({ search: this.searchQuery, lineId: this.lineaFiltro || null, page: pagina })
      .subscribe({
        next: (page) => {
          this.cargandoMas = false;
          // La búsqueda o el número cambiaron mientras respondía: esta página ya no es de esta lista.
          if (filtros !== `${this.searchQuery}|${this.lineaFiltro}`) return;
          this.paginas = pagina;
          this.hayMas = !!page.hasMore;
          const vistos = new Set(this.threads.map((t) => this.claveDe(t)));
          const nuevos = page.items.filter((t) => !vistos.has(this.claveDe(t)));
          this.ponerHilos([...this.threads, ...nuevos]);
        },
        error: () => {
          this.cargandoMas = false;
          this.errorMas = true;
        },
      });
  }

  /**
   * Más allá del tope de una petición, el refresco no trae las páginas viejas: se conservan las que ya
   * estaban (sin repetir) detrás de lo que llegó.
   */
  private conservarResto(items: WhatsappThread[], tamano: number): WhatsappThread[] {
    if (this.paginas * POR_PAGINA <= tamano) return items;
    const llegaron = new Set(items.map((t) => this.claveDe(t)));
    return [...items, ...this.threads.filter((t) => !llegaron.has(this.claveDe(t)))];
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
    this.ultimoRefresco = Date.now();
    // Un refresco en silencio con la búsqueda o el número de antes ya no sirve, ni las páginas de «Ver más».
    this.silentSub?.unsubscribe();
    this.silentSub = undefined;
    this.silentPendiente = false;
    this.masSub?.unsubscribe();
    this.cargandoMas = false;
    this.errorMas = false;
    this.paginas = 1;
    this.hayMas = false;
    this.fetchSub?.unsubscribe();
    this.fetchSub = this.inbox
      .getThreads({ search: this.searchQuery, lineId: this.lineaFiltro || null })
      .subscribe({
        next: (page) => {
          this.ponerHilos(page.items);
          this.hayMas = !!page.hasMore;
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
