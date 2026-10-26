import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { Subscription, forkJoin, interval } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { TranslateService } from "@ngx-translate/core";

import { MessagingThreadsService } from "../../../../../shared/services/messaging/messaging-threads.service";
import {
  DuenoChat,
  MiembroEquipo,
  esErrorChatConDueno,
} from "../../../../../shared/services/messaging/messaging.models";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import {
  BotThreadState,
  ContactProfile,
  WhatsappMessage,
  WhatsappThread,
} from "../../models/whatsapp-thread.model";

/**
 * Plantilla de respuesta rápida (chip del composer).
 * `sandboxBody` ya viene renderizado (sin variables {{ }}). Las 6 plantillas
 * son las mismas del catálogo demo del módulo, hardcodeadas localmente para
 * no acoplar el composer a la persistencia de plantillas (spec 009.7).
 */
interface QuickTemplate {
  id: string;
  label: string;
  sandboxBody: string;
}

/**
 * Item del feed del chat. Puede ser un separador de fecha o un mensaje.
 * Permite al template iterar una sola vez sobre items mixtos.
 */
interface DateSeparatorItem {
  kind: "date";
  label: string;
  key: string;
}

interface MessageItem {
  kind: "message";
  msg: WhatsappMessage;
  grouped: boolean;
}

type FeedItem = DateSeparatorItem | MessageItem;

/**
 * Detalle del hilo (panel derecho del shell).
 *
 * Responsabilidades:
 *  - Cargar mensajes + perfil del contacto cada vez que cambia `phoneHash`.
 *  - Render tipo chat (burbujas izquierda/derecha) con separadores de día
 *    y agrupación visual de mensajes consecutivos del mismo emisor.
 *  - Auto-scroll al último mensaje al renderizar.
 *  - Marcar el hilo como visto (botón explícito + onLoad).
 *  - Toggle del panel de contacto (renderizado al lado, no modal).
 *  - [D-437] Chats de un número del comercio (`lineId`): etiqueta del número,
 *    franja de dueño (tomar, soltar, pasar) y redactor en solo lectura cuando
 *    el chat lo atiende otra persona. Quien decide es el servidor (409
 *    `CHAT_CON_DUENO`).
 */
@Component({
  selector: "app-whatsapp-thread-detail",
  templateUrl: "./whatsapp-thread-detail.component.html",
  styleUrls: ["./whatsapp-thread-detail.component.scss"],
})
export class WhatsappThreadDetailComponent
  implements OnChanges, AfterViewChecked, OnDestroy
{
  @Input() phoneHash: string | null = null;
  /** [D-437] Número del comercio del chat; `null` = número compartido de Katuq. */
  @Input() lineId: string | null = null;
  /** [D-437] Datos del chat que trae la lista (línea, dueño y threadId). */
  @Input() chat: WhatsappThread | null = null;
  /** [D-437] Bandera `whatsappMultiNumero` del comercio. */
  @Input() multiNumero = false;
  @Input() equipo: MiembroEquipo[] = [];
  @Input() esAdministrador = false;
  @Input() miEmail = "";

  /** Emitido cuando el usuario quiere volver a la lista (mobile). */
  @Output() backToList = new EventEmitter<void>();
  /** [D-437] Cambió el dueño del chat abierto. */
  @Output() duenoCambiado = new EventEmitter<DuenoChat | null>();

  @ViewChild("messagesContainer") messagesContainer?: ElementRef<HTMLElement>;

  messages: WhatsappMessage[] = [];
  feedItems: FeedItem[] = [];
  profile: ContactProfile | null = null;
  loading = false;
  contactPanelOpen = false;

  // ─── Bot de pedidos ────────────────────────────────────────────────────
  /** Estado del bot para este hilo (null = sin bot o sin cargar). */
  botState: BotThreadState | null = null;

  /**
   * Texto del pedido que creó el bot: número, total y si está pagado (spec
   * kai-metricas, D22). Sin total legible (0 o ausente) usa el texto sin él.
   */
  get claveDelPedidoDelBot(): string {
    const p = this.botState?.pedidoCreado;
    const pagado = p?.estadoPago === 'Aprobado';
    const conTotal = Number(p?.total) > 0;
    const base = pagado ? 'notificaciones.whatsapp.detail.botOrderApproved' : 'notificaciones.whatsapp.detail.botOrderPending';
    return conTotal ? `${base}Total` : base;
  }
  /** Lock del botón tomar/devolver mientras responde el backend. */
  botActionBusy = false;

  // ─── Dueño del chat (D-437) ─────────────────────────────────────────────
  /** Quién atiende el chat; `null` = sin asignar. */
  dueno: DuenoChat | null = null;
  /** Lock de tomar / soltar / pasar mientras responde el servidor. */
  duenoOcupado = false;

  // ─── Composer ──────────────────────────────────────────────────────────
  /** Texto en edición del composer. Two-way binding con el textarea. */
  composerText = "";
  /** Lock visual durante el POST /reply. */
  sending = false;
  /** [D-118] Id idempotente del mensaje en curso (se reusa en reintentos). */
  private pendingClientMessageId: string | null = null;
  /** [D-118] Texto al que corresponde pendingClientMessageId. */
  private pendingForText: string | null = null;
  /** Dropdown de plantillas abierto/cerrado. */
  templatesOpen = false;
  /** 6 plantillas rápidas con sandboxBody ya renderizado. */
  readonly quickTemplates: QuickTemplate[] = [
    {
      id: "saludo",
      label: "notificaciones.whatsapp.templates.greeting",
      sandboxBody:
        "Hola, gracias por escribirnos. ¿En qué te podemos ayudar hoy?",
    },
    {
      id: "pedido-recibido",
      label: "notificaciones.whatsapp.templates.orderReceived",
      sandboxBody:
        "¡Confirmamos la recepción de tu pedido! Lo estamos preparando y te avisaremos cuando salga.",
    },
    {
      id: "despacho",
      label: "notificaciones.whatsapp.templates.shipping",
      sandboxBody:
        "Tu pedido va en camino con el transportador. Llega en máximo 48 horas hábiles.",
    },
    {
      id: "pago-pendiente",
      label: "notificaciones.whatsapp.templates.paymentPending",
      sandboxBody:
        "Notamos que el pago de tu pedido aún está pendiente. ¿Te ayudamos a completarlo?",
    },
    {
      id: "stock",
      label: "notificaciones.whatsapp.templates.outOfStock",
      sandboxBody:
        "Lamentamos informarte que el producto está agotado por el momento. ¿Te interesa una alternativa?",
    },
    {
      id: "cierre",
      label: "notificaciones.whatsapp.templates.closing",
      sandboxBody:
        "Gracias por tu mensaje. Si necesitas algo más, estamos aquí para ayudarte.",
    },
  ];

  /** Flag para correr el auto-scroll una sola vez tras un load. */
  private needsScroll = false;
  /** Suscripción del polling cada 8s; se cancela en ngOnDestroy. */
  private refreshSub: Subscription | null = null;

  constructor(
    private readonly inbox: WhatsappInboxService,
    private readonly toastr: ToastrService,
    private readonly hilos: MessagingThreadsService,
    private readonly translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["chat"] || changes["phoneHash"] || changes["lineId"]) {
      this.dueno = this.chat?.owner || null;
    }
    if (changes["phoneHash"] || changes["lineId"]) {
      this.contactPanelOpen = false;
      this.composerText = "";
      this.templatesOpen = false;
      this.loadAll();
      this.restartAutoRefresh();
    }
  }

  ngAfterViewChecked(): void {
    if (this.needsScroll && this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.needsScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  toggleContactPanel(): void {
    this.contactPanelOpen = !this.contactPanelOpen;
  }

  markAsRead(): void {
    if (!this.phoneHash) {
      return;
    }
    this.inbox.markThreadViewed(this.phoneHash, this.lineId).subscribe({
      error: () => undefined,
    });
  }

  onBack(): void {
    this.backToList.emit();
  }

  get headerName(): string {
    if (!this.profile) {
      return "";
    }
    return (
      this.profile.clienteNombre ||
      this.profile.profileName ||
      this.profile.phoneMasked ||
      this.translate.instant('notificaciones.whatsapp.detail.contact')
    );
  }

  get headerInitials(): string {
    const name = this.headerName.trim();
    if (!name) {
      return "?";
    }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "?";
    }
    const first = parts[0][0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  /**
   * QueryParams para "Ver datos del cliente" — usa el nombre del cliente como
   * filtro de búsqueda si está registrado. Sin nombre, abre el módulo sin
   * filtro pero ya posicionado en /ventas/clienteslista.
   */
  get clientLinkParams(): Record<string, string> {
    const name = this.profile?.clienteNombre;
    return name ? { buscar: name } : {};
  }

  trackFeedItem(_: number, item: FeedItem): string {
    return item.kind === "date" ? `d:${item.key}` : `m:${item.msg.id}`;
  }

  isDateItem(item: FeedItem): item is DateSeparatorItem {
    return item.kind === "date";
  }

  isMessageItem(item: FeedItem): item is MessageItem {
    return item.kind === "message";
  }

  /** Etiqueta del placeholder de media. */
  mediaLabel(msg: WhatsappMessage): string {
    switch (msg.type) {
      case "image":
        return this.translate.instant('notificaciones.whatsapp.media.image');
      case "audio":
        return this.translate.instant('notificaciones.whatsapp.media.audio');
      case "document":
        return this.translate.instant('notificaciones.whatsapp.media.document');
      case "sticker":
        return this.translate.instant('notificaciones.whatsapp.media.sticker');
      default:
        return this.translate.instant('notificaciones.whatsapp.media.attachment');
    }
  }

  /** Icono para el status de mensajes outbound. */
  statusIcon(status: string): string {
    switch (status) {
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      case "failed":
        return "✕";
      default:
        return "";
    }
  }

  /** Hora HH:MM (formato 12h) del timestamp ISO del mensaje. */
  formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "";
    }
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "p.m." : "a.m.";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  // ─── Composer ────────────────────────────────────────────────────────
  /**
   * Submit del composer. Hace POST /reply, en éxito limpia el textarea
   * y recarga mensajes para que aparezca el saliente recién enviado.
   * Si falla, dispara toast rojo con el mensaje del backend.
   */
  onSend(event: Event): void {
    event.preventDefault();
    if (!this.phoneHash) {
      return;
    }
    const text = (this.composerText || "").trim();
    if (!text || this.sending) {
      return;
    }
    // [D-437] Chat de otra persona: el servidor lo rechazaría (409).
    if (this.soloLectura) {
      return;
    }
    const hash = this.phoneHash;
    // [D-118] Id estable por mensaje lógico: si el envío falla (o el operador
    // no sabe si salió) y reintenta el MISMO texto, se reusa el id y el
    // backend no dispara un segundo mensaje real. Texto editado → id nuevo.
    if (!this.pendingClientMessageId || this.pendingForText !== text) {
      this.pendingClientMessageId =
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      this.pendingForText = text;
    }
    this.sending = true;
    this.inbox
      .sendReply(hash, text, this.pendingClientMessageId, this.lineId)
      .subscribe({
        next: () => {
          this.pendingClientMessageId = null;
          this.pendingForText = null;
          this.composerText = "";
          this.sending = false;
          this.toastr.success(this.translate.instant('notificaciones.whatsapp.detail.sent'), "WhatsApp");
          // Recargar para ver el saliente en el feed.
          this.refreshMessages();
          // Responder a mano le quita el hilo al bot (lo marca el backend);
          // refrescar el estado para que la franja cambie de una.
          this.cargarEstadoBot(hash);
        },
        error: (err: any) => {
          this.sending = false;
          // [D-437] El chat lo atiende otra persona: se pinta su nombre y el redactor queda en lectura.
          if (esErrorChatConDueno(err)) {
            this.ponerDueno(err.error.owner || null);
            this.toastr.warning(err.error.message || this.translate.instant('notificaciones.whatsapp.detail.ownedByOther'), this.translate.instant('notificaciones.whatsapp.detail.ownedTitle'));
            return;
          }
          const message =
            err?.error?.message || err?.error?.error || err?.message || this.translate.instant('notificaciones.whatsapp.detail.sendError');
          this.toastr.error(message, this.translate.instant('notificaciones.whatsapp.detail.sendErrorTitle'));
        },
      });
  }

  /**
   * Enter envía. Shift+Enter inserta salto de línea (comportamiento default
   * del textarea, así que solo bloqueamos cuando NO hay shift).
   */
  onEnterPress(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.shiftKey) {
      return; // permitir newline
    }
    event.preventDefault();
    this.onSend(event);
  }

  /** Abrir/cerrar dropdown de plantillas. */
  toggleTemplates(): void {
    this.templatesOpen = !this.templatesOpen;
  }

  /**
   * Click en una plantilla: llena el composer con el `sandboxBody` renderizado
   * y cierra el dropdown. No envía automáticamente — el operador puede editar.
   */
  applyTemplate(tpl: QuickTemplate): void {
    this.composerText = tpl.sandboxBody;
    this.templatesOpen = false;
  }

  /** True si la UI debe mostrar el composer (hay hilo abierto con mensajes). */
  get canShowComposer(): boolean {
    return !!this.phoneHash && this.messages.length > 0;
  }

  // ─── Auto-refresh ────────────────────────────────────────────────────
  /**
   * Recargar mensajes sin re-pedir el perfil ni mover el `loading` flag.
   * Usado por el polling y tras enviar una respuesta.
   */
  private refreshMessages(): void {
    if (!this.phoneHash) {
      return;
    }
    const hash = this.phoneHash;
    const lineId = this.lineId;
    // Antes del refresh, pedir al backend que sincronice inbounds desde Kapso
    // (best-effort, el servicio ignora el error).
    this.inbox.syncInbound().subscribe();
    this.inbox.getMessages(hash, lineId).subscribe({
      next: (page) => {
        // Si el chat cambió mientras respondía, se descarta.
        if (this.phoneHash !== hash || this.lineId !== lineId) return;
        const items = page.items;
        if (items.length === 0) return; // mantener estado anterior si vacío
        const prevCount = this.messages.length;
        this.messages = items;
        this.feedItems = this.buildFeedItems(items);
        this.needsScroll = true;
        // Si llegaron ENTRANTES nuevos con el chat abierto, marcarlos vistos
        // de una — antes el badge de la lista crecía aunque el operador
        // estuviera leyendo el hilo ("abro el chat y no se quitan").
        const nuevosInbound = items
          .slice(prevCount)
          .some((m) => m.direction === "inbound");
        if (items.length > prevCount && nuevosInbound) {
          this.markAsRead();
        }
      },
      error: () => undefined,
    });
  }

  /**
   * Polling cada 8s. Solo refresca si no estamos enviando y el composer
   * está vacío — evita interrumpir al operador mientras redacta.
   */
  private restartAutoRefresh(): void {
    this.stopAutoRefresh();
    if (!this.phoneHash) {
      return;
    }
    this.refreshSub = interval(8000).subscribe(() => {
      // [D-117] Pestaña oculta → no pollear (cada tick cuesta lecturas
      // Firestore del hilo completo); al volver, el siguiente tick refresca.
      if (document.hidden) return;
      if (this.sending) return;
      if ((this.composerText || "").trim().length > 0) return;
      this.refreshMessages();
    });
  }

  private stopAutoRefresh(): void {
    if (this.refreshSub) {
      this.refreshSub.unsubscribe();
      this.refreshSub = null;
    }
  }

  // ─── Bot de pedidos ─────────────────────────────────────────────────────

  /** Carga (o refresca) el estado del bot para el hilo. Nunca bloquea el chat. */
  private cargarEstadoBot(hash: string): void {
    this.inbox.getBotState(hash, this.lineId).subscribe({
      next: (estado) => {
        // Si el hilo cambió mientras respondía, se descarta.
        if (this.phoneHash === hash) this.botState = estado;
      },
      error: () => undefined,
    });
  }

  /** El vendedor se queda con la conversación; el bot se calla en este hilo. */
  tomarConversacion(): void {
    if (!this.phoneHash || this.botActionBusy) return;
    const hash = this.phoneHash;
    this.botActionBusy = true;
    this.inbox.tomarConversacion(hash, this.lineId).subscribe({
      next: () => {
        this.botActionBusy = false;
        this.toastr.success(this.translate.instant('notificaciones.whatsapp.detail.tookConversation'));
        this.cargarEstadoBot(hash);
      },
      error: () => {
        this.botActionBusy = false;
        this.toastr.error(this.translate.instant('notificaciones.whatsapp.detail.takeError'));
      },
    });
  }

  /** Le devuelve la conversación al bot (arranca con la cuenta de turnos en cero). */
  devolverAlBot(): void {
    if (!this.phoneHash || this.botActionBusy) return;
    const hash = this.phoneHash;
    this.botActionBusy = true;
    this.inbox.devolverAlBot(hash, this.lineId).subscribe({
      next: () => {
        this.botActionBusy = false;
        this.toastr.success(this.translate.instant('notificaciones.whatsapp.detail.returnedToBot'));
        this.cargarEstadoBot(hash);
      },
      error: () => {
        this.botActionBusy = false;
        this.toastr.error(this.translate.instant('notificaciones.whatsapp.detail.returnError'));
      },
    });
  }

  private loadAll(): void {
    if (!this.phoneHash) {
      this.messages = [];
      this.feedItems = [];
      this.profile = null;
      this.botState = null;
      return;
    }
    this.loading = true;
    const hash = this.phoneHash;
    const lineId = this.lineId;
    this.cargarEstadoBot(hash);
    forkJoin([
      this.inbox.getMessages(hash, lineId),
      this.inbox.getContactProfile(hash, lineId),
    ]).subscribe({
      next: ([page, profile]) => {
        if (this.phoneHash !== hash || this.lineId !== lineId) return;
        this.messages = page.items;
        this.feedItems = this.buildFeedItems(page.items);
        this.profile = profile;
        this.loading = false;
        this.needsScroll = true;
        this.inbox
          .markThreadViewed(hash, lineId)
          .subscribe({ error: () => undefined });
      },
      // Si falla, se mantiene el estado anterior (como antes de D-437).
      error: () => {
        this.loading = false;
      },
    });
  }

  // ─── Dueño del chat (D-437) ───────────────────────────────────────────

  /** La franja de dueño se ve en chats de un número del comercio, con la bandera encendida. */
  get mostrarDueno(): boolean {
    return this.multiNumero && !!this.lineId && !!this.chat?.threadId;
  }

  /** El chat lo atiende otra persona: el redactor queda en lectura. */
  get soloLectura(): boolean {
    if (!this.dueno) return false;
    return (this.dueno.email || "").toLowerCase() !== (this.miEmail || "").toLowerCase();
  }

  get motivoLectura(): string {
    const nombre = this.dueno?.nombre || this.dueno?.email || this.translate.instant('notificaciones.whatsapp.detail.someoneElse');
    return this.esAdministrador
      ? this.translate.instant('notificaciones.whatsapp.detail.readOnlyAdmin', { nombre })
      : this.translate.instant('notificaciones.whatsapp.detail.readOnly', { nombre });
  }

  tomarChat(): void {
    const threadId = this.chat?.threadId;
    if (!threadId) return;
    this.accionDueno(this.hilos.tomar(threadId), "notificaciones.whatsapp.detail.ownerTaken");
  }

  soltarChat(): void {
    const threadId = this.chat?.threadId;
    if (!threadId) return;
    this.accionDueno(this.hilos.soltar(threadId), "notificaciones.whatsapp.detail.ownerReleased");
  }

  pasarChat(email: string): void {
    const threadId = this.chat?.threadId;
    if (!threadId || !email) return;
    this.accionDueno(this.hilos.asignar(threadId, email), "notificaciones.whatsapp.detail.ownerPassed");
  }

  private accionDueno(peticion: ReturnType<MessagingThreadsService["tomar"]>, exito: string): void {
    if (this.duenoOcupado) return;
    this.duenoOcupado = true;
    peticion.subscribe({
      next: (owner) => {
        this.duenoOcupado = false;
        this.ponerDueno(owner);
        this.toastr.success(this.translate.instant(exito));
      },
      error: (err: any) => {
        this.duenoOcupado = false;
        if (esErrorChatConDueno(err)) {
          this.ponerDueno(err.error.owner || null);
          this.toastr.warning(err.error.message || this.translate.instant('notificaciones.whatsapp.detail.alreadyOwned'), this.translate.instant('notificaciones.whatsapp.detail.ownedTitle'));
          return;
        }
        // Los 403 ya los avisa el interceptor con el mensaje del servidor.
        if (err?.status === 403) return;
        this.toastr.error(err?.error?.message || this.translate.instant('notificaciones.whatsapp.detail.ownerChangeError'));
      },
    });
  }

  private ponerDueno(owner: DuenoChat | null): void {
    this.dueno = owner && owner.email ? owner : null;
    this.duenoCambiado.emit(this.dueno);
  }

  /**
   * Construye el feed mixto con separadores de día + mensajes agrupados.
   *
   * - Cada cambio de día inserta un `DateSeparatorItem` ("Hoy", "Ayer" o
   *   fecha corta tipo "Lun, 15 jun").
   * - Mensajes consecutivos del mismo emisor llevan `grouped=true` para que
   *   visualmente se peguen (border-radius compactado).
   */
  private buildFeedItems(messages: WhatsappMessage[]): FeedItem[] {
    const items: FeedItem[] = [];
    let lastDayKey = "";
    let lastDirection = "";

    for (const msg of messages) {
      const d = new Date(msg.sentAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dayKey !== lastDayKey) {
        items.push({
          kind: "date",
          label: this.formatDay(d),
          key: dayKey,
        });
        lastDayKey = dayKey;
        lastDirection = ""; // reset agrupación al cambiar de día
      }
      const grouped =
        lastDirection === msg.direction && items.length > 0;
      items.push({ kind: "message", msg, grouped });
      lastDirection = msg.direction;
    }
    return items;
  }

  private formatDay(d: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - day.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return this.translate.instant('notificaciones.whatsapp.detail.today');
    if (diffDays === 1) return this.translate.instant('notificaciones.whatsapp.detail.yesterday');
    if (diffDays < 7) {
      return day
        .toLocaleDateString("es-CO", { weekday: "long" })
        .replace(/^./, (c) => c.toUpperCase());
    }
    return day.toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }
}
