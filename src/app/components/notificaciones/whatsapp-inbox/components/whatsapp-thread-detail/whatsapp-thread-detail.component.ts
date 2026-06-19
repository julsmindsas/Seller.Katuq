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

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import {
  ContactProfile,
  WhatsappMessage,
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

  /** Emitido cuando el usuario quiere volver a la lista (mobile). */
  @Output() backToList = new EventEmitter<void>();

  @ViewChild("messagesContainer") messagesContainer?: ElementRef<HTMLElement>;

  messages: WhatsappMessage[] = [];
  feedItems: FeedItem[] = [];
  profile: ContactProfile | null = null;
  loading = false;
  contactPanelOpen = false;

  // ─── Composer ──────────────────────────────────────────────────────────
  /** Texto en edición del composer. Two-way binding con el textarea. */
  composerText = "";
  /** Lock visual durante el POST /reply. */
  sending = false;
  /** Dropdown de plantillas abierto/cerrado. */
  templatesOpen = false;
  /** 6 plantillas rápidas con sandboxBody ya renderizado. */
  readonly quickTemplates: QuickTemplate[] = [
    {
      id: "saludo",
      label: "Saludo inicial",
      sandboxBody:
        "Hola, gracias por escribirnos. ¿En qué te podemos ayudar hoy?",
    },
    {
      id: "pedido-recibido",
      label: "Pedido recibido",
      sandboxBody:
        "¡Confirmamos la recepción de tu pedido! Lo estamos preparando y te avisaremos cuando salga.",
    },
    {
      id: "despacho",
      label: "Despacho en camino",
      sandboxBody:
        "Tu pedido va en camino con el transportador. Llega en máximo 48 horas hábiles.",
    },
    {
      id: "pago-pendiente",
      label: "Pago pendiente",
      sandboxBody:
        "Notamos que el pago de tu pedido aún está pendiente. ¿Te ayudamos a completarlo?",
    },
    {
      id: "stock",
      label: "Sin stock",
      sandboxBody:
        "Lamentamos informarte que el producto está agotado por el momento. ¿Te interesa una alternativa?",
    },
    {
      id: "cierre",
      label: "Cierre cordial",
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
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["phoneHash"]) {
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
    this.inbox.markThreadViewed(this.phoneHash).subscribe({
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
      "Contacto"
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
        return "📷 Imagen";
      case "audio":
        return "🎤 Audio";
      case "document":
        return "📄 Documento";
      case "sticker":
        return "Sticker";
      default:
        return "Adjunto";
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
    const hash = this.phoneHash;
    this.sending = true;
    this.inbox
      .sendReply(hash, text)
      .then(() => {
        this.composerText = "";
        this.sending = false;
        this.toastr.success("Mensaje enviado", "WhatsApp");
        // Recargar para ver el saliente en el feed.
        this.refreshMessages();
      })
      .catch((err: Error) => {
        this.sending = false;
        const message = err?.message || "No se pudo enviar el mensaje";
        this.toastr.error(message, "Error al enviar");
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
    // Fetch directo (mismo workaround del HMR singleton cacheado).
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
    // Antes del refresh, pedir al backend que sincronice inbounds desde Kapso
    // (best-effort, ignoramos errores). Sandbox local sin webhook expuesto.
    fetch("http://localhost:3300/v1/whatsapp/sync-inbound", {
      method: "POST",
      headers,
    }).catch(() => undefined);
    fetch(
      "http://localhost:3300/v1/whatsapp/conversations/" +
        encodeURIComponent(hash) +
        "/messages",
      { headers },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((resp: any) => {
        const raw = resp?.items || [];
        if (raw.length === 0) return; // mantener estado anterior si vacío
        const items = raw
          .slice()
          .sort((a: any, b: any) => {
            const am = new Date(a.timestamp || a.sentAt || 0).getTime();
            const bm = new Date(b.timestamp || b.sentAt || 0).getTime();
            return am - bm;
          })
          .map((m: any) => ({
            id: m.id,
            direction: m.direction === "inbound" ? "inbound" : "outbound",
            type: "text" as any,
            body:
              m.text ||
              m.body ||
              m.textPreview ||
              (m.templateName ? `[${m.templateName}]` : ""),
            snippet:
              m.textPreview ||
              m.text ||
              m.body ||
              (m.templateName ? `[${m.templateName}]` : ""),
            sentAt:
              m.timestamp ||
              m.sentAt ||
              m.receivedAt ||
              new Date().toISOString(),
            status: m.status || (m.direction === "inbound" ? "delivered" : "sent"),
            mediaPlaceholder: false,
          }));
        this.messages = items as any;
        this.feedItems = this.buildFeedItems(items as any);
        this.needsScroll = true;
      })
      .catch(() => undefined);
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

  private loadAll(): void {
    if (!this.phoneHash) {
      this.messages = [];
      this.feedItems = [];
      this.profile = null;
      return;
    }
    this.loading = true;
    const hash = this.phoneHash;
    // Fetch directo para evitar el bug del provider singleton cacheado por HMR
    // (mismo patrón que thread-list.fetchThreads).
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
    const base = "http://localhost:3300/v1/whatsapp/conversations/" +
      encodeURIComponent(hash);
    Promise.all([
      fetch(base + "/messages", { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject(r),
      ),
      fetch(base + "/profile", { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject(r),
      ),
    ])
      .then(([msgResp, profResp]) => {
        const rawMsgs = msgResp?.items || [];
        const items = rawMsgs
          .slice()
          .sort((a: any, b: any) => {
            const am = new Date(a.timestamp || a.sentAt || 0).getTime();
            const bm = new Date(b.timestamp || b.sentAt || 0).getTime();
            return am - bm;
          })
          .map((m: any) => ({
            id: m.id,
            direction: m.direction === "inbound" ? "inbound" : "outbound",
            type: "text" as any,
            body:
              m.text ||
              m.body ||
              m.textPreview ||
              (m.templateName ? `[${m.templateName}]` : ""),
            snippet:
              m.textPreview ||
              m.text ||
              m.body ||
              (m.templateName ? `[${m.templateName}]` : ""),
            sentAt:
              m.timestamp ||
              m.sentAt ||
              m.receivedAt ||
              new Date().toISOString(),
            status: m.status || (m.direction === "inbound" ? "delivered" : "sent"),
            mediaPlaceholder: false,
          }));
        this.messages = items as any;
        this.feedItems = this.buildFeedItems(items as any);
        this.profile = {
          phoneHash: profResp?.phoneHash || hash,
          phoneMasked: profResp?.phoneMasked || "+??***????",
          clienteNombre: profResp?.clienteNombre,
          profileName: profResp?.profileName,
          isClienteRegistrado: !!profResp?.isClienteRegistrado,
          lead: profResp?.lead || null,
          ratingDraft: profResp?.ratingDraft || null,
        } as any;
        this.loading = false;
        this.needsScroll = true;
        this.inbox
          .markThreadViewed(hash)
          .subscribe({ error: () => undefined });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[thread-detail] loadAll error — manteniendo estado anterior", err);
        this.loading = false;
      });
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
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Ayer";
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
