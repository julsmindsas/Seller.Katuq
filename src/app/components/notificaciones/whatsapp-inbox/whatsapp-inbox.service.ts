import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map, retry } from "rxjs/operators";

import { BaseService } from "../../../shared/services/base.service";
import {
  BotSesionResumen,
  BotThreadState,
  ContactProfile,
  MessagesPage,
  Order,
  ThreadsPage,
  WhatsappMessage,
  WhatsappThread,
} from "./models/whatsapp-thread.model";

/** Plantilla aprobada del WABA (modal "Iniciar nueva conversación"). */
export interface KapsoTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
  variables: number[];
  /** Título en español para gente no técnica (el backend lo trae). */
  titulo?: string;
  descripcion?: string;
  uso?: string;
}

/**
 * Servicio del módulo WhatsApp Inbox (spec 009).
 *
 * Todo pasa por `BaseService`, así el interceptor HTTP del proyecto
 * (`HttpInterceptor2`) adjunta `Authorization`, `company`, `user` y
 * `usage-code` en cada request. Ni el servicio ni los componentes del buzón
 * usan `fetch` ni `HttpClient` directo: sin el interceptor, el servidor
 * respondía 401 (D-437).
 *
 * Sin datos de demostración: si el servidor falla, la pantalla muestra el
 * error o el estado vacío reales.
 *
 * [D-437] Las rutas de un chat aceptan `lineId`: el mismo cliente en dos
 * números del comercio son dos chats. Sin `lineId` el chat es del número
 * compartido de Katuq, como siempre.
 *
 * Va en `providedIn: "root"`, no en los providers del módulo lazy: SharedModule
 * importa HttpClientModule, y un servicio provisto en el módulo recibe un
 * HttpClient sin los interceptores del root (las peticiones salían sin
 * Authorization y el backend respondía 401). Mismo caso que ImagenService.
 *
 * Endpoints:
 *   GET    /v1/whatsapp/conversations                    ?search=&status=&page=&lineId=
 *   GET    /v1/whatsapp/conversations/:phoneHash/messages ?lineId=
 *   GET    /v1/whatsapp/conversations/:phoneHash/profile  ?lineId=
 *   GET    /v1/whatsapp/conversations/:phoneHash/orders   ?lineId=
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/viewed   ?lineId=
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/rating   ?lineId=  { score }
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/optout   ?lineId=  { optedOut }
 *   POST   /v1/whatsapp/conversations/:phoneHash/reply    ?lineId=  { text, clientMessageId }
 *   GET    /v1/whatsapp/conversations/:phoneHash/bot      ?lineId=
 *   POST   /v1/whatsapp/conversations/:phoneHash/bot/{tomar,devolver} ?lineId=
 *   GET    /v1/whatsapp/conversations/bot/sesiones
 *   POST   /v1/whatsapp/sync-inbound
 *   GET    /v1/whatsapp/kapso-templates
 *   POST   /v1/whatsapp/start-conversation
 */
@Injectable({ providedIn: "root" })
export class WhatsappInboxService extends BaseService {
  private readonly base = "/v1/whatsapp/conversations";

  constructor(http: HttpClient) {
    super(http);
  }

  /** Listado de hilos. Con `lineId`, solo los chats de ese número. */
  getThreads(
    opts: {
      search?: string;
      status?: "all" | "unread";
      page?: number;
      lineId?: string | null;
    } = {},
  ): Observable<ThreadsPage> {
    const search = (opts.search || "").trim();
    const params: Record<string, string | null | undefined> = {
      search: search || null,
      status: opts.status && opts.status !== "all" ? opts.status : null,
      page: opts.page && opts.page > 1 ? String(opts.page) : null,
      lineId: opts.lineId || null,
    };
    return this.get<any>(`${this.base}${this.query(params)}`).pipe(
      map((response: any) => {
        const items: any[] = response?.items || [];
        return {
          items: items.map((it) => this.adaptarHilo(it)),
          totalCount: response?.totalCount ?? items.length,
          hasMore: response?.hasMore ?? false,
          nextCursor: response?.nextCursor,
        } as ThreadsPage;
      }),
    );
  }

  /** Mensajes de un hilo, en orden ascendente. */
  getMessages(phoneHash: string, lineId?: string | null): Observable<MessagesPage> {
    return this.get<any>(this.rutaChat(phoneHash, "/messages", lineId)).pipe(
      map((response: any) => {
        const raw: any[] = response?.items || [];
        const items = raw
          .slice()
          .sort((a, b) => {
            const am = new Date(a.timestamp || a.sentAt || 0).getTime();
            const bm = new Date(b.timestamp || b.sentAt || 0).getTime();
            return am - bm;
          })
          .map((m) => this.adaptarMensaje(m));
        return { items, hasMore: !!response?.hasMore };
      }),
    );
  }

  /** Perfil del contacto (cabecera del chat y panel derecho). */
  getContactProfile(phoneHash: string, lineId?: string | null): Observable<ContactProfile> {
    return this.get<any>(this.rutaChat(phoneHash, "/profile", lineId)).pipe(
      map((p: any) => ({
        phoneHash: p?.phoneHash || phoneHash,
        phoneMasked: p?.phoneMasked || "+??***????",
        clienteNombre: p?.clienteNombre || undefined,
        profileName: p?.profileName || undefined,
        isClienteRegistrado: !!p?.isClienteRegistrado,
        hasOrderHistory: !!p?.hasOrderHistory,
        lead: p?.lead || null,
        ratingDraft: p?.ratingDraft || null,
        optedOut: !!p?.optedOut,
      })),
    );
  }

  /** Pedidos del contacto (panel derecho). Acepta `{ items }` o un arreglo. */
  getContactOrders(phoneHash: string, lineId?: string | null): Observable<Order[]> {
    return this.get<any>(this.rutaChat(phoneHash, "/orders", lineId)).pipe(
      map((response: any) => {
        const items: any[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
          ? response.items
          : [];
        return items.map((o) => ({
          orderId: o.id || o.orderId,
          nroPedido: o.numero || o.nroPedido || "S/N",
          estado: o.estado || o.estadoProceso || "—",
          total: o.total || 0,
          fechaCreacion: o.fechaCreacion,
          currency: "COP",
          deepLink: `/ventas/detalle/${o.id || o.orderId}`,
        }));
      }),
    );
  }

  /**
   * Marca el hilo como visto. [D-105] Sin respuesta fingida: un reintento a
   * los 2 s y, si aún falla, `{ updated: 0 }`; el badge vuelve en el próximo
   * refresco de la lista, que es lo honesto (sigue sin leer en el servidor).
   */
  markThreadViewed(phoneHash: string, lineId?: string | null): Observable<{ updated: number }> {
    return this.patch<{ updated: number }>(this.rutaChat(phoneHash, "/viewed", lineId), {}).pipe(
      retry({ count: 1, delay: 2000 }),
      map((response) =>
        response && typeof response.updated === "number" ? response : { updated: 0 },
      ),
      catchError(() => of({ updated: 0 })),
    );
  }

  /**
   * Responde en el hilo. [D-118] `clientMessageId` lo genera el componente y
   * se reusa en reintentos del mismo texto, así el servidor no lo envía dos
   * veces. [D-437] Si el chat lo atiende otra persona responde 409
   * `CHAT_CON_DUENO` (ver `esErrorChatConDueno`).
   */
  sendReply(
    phoneHash: string,
    text: string,
    clientMessageId?: string,
    lineId?: string | null,
  ): Observable<{ id?: string; sentAt?: string; status?: string }> {
    const msgId =
      clientMessageId ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return this.post<{ id?: string; sentAt?: string; status?: string }>(
      this.rutaChat(phoneHash, "/reply", lineId),
      { text, clientMessageId: msgId },
    );
  }

  /** [D-098] Marca o quita "no contactar" (opt-out de marketing). */
  setOptOut(phoneHash: string, optedOut: boolean, lineId?: string | null): Observable<unknown> {
    return this.patch<unknown>(this.rutaChat(phoneHash, "/optout", lineId), { optedOut });
  }

  /** Califica al contacto (1-5). */
  rateContact(phoneHash: string, score: number, lineId?: string | null): Observable<{ score: number }> {
    return this.patch<{ score: number }>(this.rutaChat(phoneHash, "/rating", lineId), { score }).pipe(
      map((response) => (response && typeof response.score === "number" ? response : { score })),
    );
  }

  /**
   * Pide al servidor que traiga los entrantes de Kapso (por si el cron no
   * alcanzó). Mejor esfuerzo: un fallo no cambia nada en pantalla.
   */
  syncInbound(): Observable<unknown> {
    return this.post<unknown>("/v1/whatsapp/sync-inbound", {}).pipe(catchError(() => of(null)));
  }

  /** Guarda el contacto como lead en el CRM de Katuq. */
  guardarLeadEnCrm(body: Record<string, unknown>): Observable<any> {
    return this.post<any>("/v1/crm/leads/import", body);
  }

  /** Plantillas aprobadas para escribirle a un cliente (sin las del sistema). */
  getKapsoTemplates(): Observable<KapsoTemplate[]> {
    return this.get<any>("/v1/whatsapp/kapso-templates").pipe(
      map((resp: any) => (resp?.items || []).filter((t: any) => t.uso !== "sistema")),
    );
  }

  /** Envía una plantilla a un número para abrir conversación fuera de la ventana de 24 h. */
  startConversation(body: {
    phone: string;
    templateName: string;
    languageCode: string;
    variables: string[];
  }): Observable<{ balanceAfter?: number }> {
    return this.post<{ balanceAfter?: number }>("/v1/whatsapp/start-conversation", body);
  }

  // ============================================================
  // Bot de pedidos
  // ============================================================

  /**
   * Conversaciones del bot de pedidos (vista "Pedidos" del buzón).
   * Si falla, lista vacía: la vista muestra su estado vacío.
   */
  getBotSesiones(): Observable<BotSesionResumen[]> {
    return this.get<{ items: BotSesionResumen[] }>(`${this.base}/bot/sesiones`).pipe(
      map((res: any) => (Array.isArray(res?.items) ? res.items : [])),
      catchError(() => of([] as BotSesionResumen[])),
    );
  }

  /**
   * Estado del bot de pedidos para un hilo. Si falla, `null`: sin estado, el
   * buzón se comporta como siempre.
   */
  getBotState(phoneHash: string, lineId?: string | null): Observable<BotThreadState | null> {
    return this.get<BotThreadState>(this.rutaChat(phoneHash, "/bot", lineId)).pipe(
      map((res: any) => (res && typeof res === "object" ? (res as BotThreadState) : null)),
      catchError(() => of(null)),
    );
  }

  /** El vendedor se queda con la conversación: el bot se calla en este hilo. */
  tomarConversacion(phoneHash: string, lineId?: string | null): Observable<{ success: boolean }> {
    return this.post<{ success: boolean }>(this.rutaChat(phoneHash, "/bot/tomar", lineId), {});
  }

  /** Le devuelve la conversación al bot (reinicia su cuenta de turnos). */
  devolverAlBot(phoneHash: string, lineId?: string | null): Observable<{ success: boolean }> {
    return this.post<{ success: boolean }>(this.rutaChat(phoneHash, "/bot/devolver", lineId), {});
  }

  // ------------------------------------------------------------------

  private rutaChat(phoneHash: string, sufijo: string, lineId?: string | null): string {
    return `${this.base}/${encodeURIComponent(phoneHash)}${sufijo}${this.query({ lineId })}`;
  }

  private query(params: Record<string, string | null | undefined>): string {
    const partes = Object.keys(params)
      .filter((k) => !!params[k])
      .map((k) => `${k}=${encodeURIComponent(params[k] as string)}`);
    return partes.length ? `?${partes.join("&")}` : "";
  }

  private adaptarHilo(it: any): WhatsappThread {
    return {
      phoneHash: it.phoneHash,
      phoneMasked: it.phoneMasked,
      contactName: it.clienteNombre || it.profileName || "Sin nombre",
      lastMessageAt: it.lastMessageAt,
      lastMessageSnippet: it.lastMessagePreview || it.lastMessageSnippet || "",
      unreadCount: it.unreadCount || 0,
      lastDirection: it.lastMessageDirection || it.lastDirection || "outbound",
      messageCount: it.totalMessages || it.messageCount || 0,
      flags: it.flags,
      threadId: it.threadId || null,
      line: it.line && it.line.id ? it.line : null,
      owner: it.owner && it.owner.email ? it.owner : null,
    };
  }

  /**
   * El backend devuelve otra forma (templateName, textPreview, timestamp); se
   * pasa a `WhatsappMessage`. Los del bot de pedidos llegan como BOT_REPLY y el
   * chat les pinta la marca.
   */
  private adaptarMensaje(m: any): WhatsappMessage {
    const plantilla = m.templateName ? `[${m.templateName}]` : "";
    return {
      id: m.id,
      direction: m.direction === "inbound" ? "inbound" : "outbound",
      esBot: String(m.type || "") === "BOT_REPLY",
      type: "text",
      body: m.text || m.body || m.textPreview || plantilla,
      snippet: m.textPreview || m.text || m.body || plantilla,
      sentAt: m.timestamp || m.sentAt || m.receivedAt || new Date().toISOString(),
      status: m.status || (m.direction === "inbound" ? "delivered" : "sent"),
      mediaPlaceholder: false,
    };
  }
}
