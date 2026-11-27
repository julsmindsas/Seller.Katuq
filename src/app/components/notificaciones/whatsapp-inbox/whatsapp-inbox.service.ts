import { HttpClient, HttpContext, HttpErrorResponse, HttpEvent, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Observable, of, throwError } from "rxjs";
import { catchError, map, retry } from "rxjs/operators";

import { environment } from "../../../../environments/environment";
import { BaseService } from "../../../shared/services/base.service";
import { SKIP_LOADER } from "../../../shared/services/interceptor/loader.interceptor";
import { SIN_AVISO_NEGOCIO } from "../../../shared/services/interceptor/sin-aviso-negocio.context";
import {
  BotSesionResumen,
  BotThreadState,
  ContactProfile,
  MediaInfo,
  MediaKind,
  MessagesPage,
  Order,
  ThreadsPage,
  UbicacionMensaje,
  VentanaChat,
  WhatsappMessage,
  WhatsappThread,
  WhatsappMessageType,
} from "./models/whatsapp-thread.model";
import { esNombreTecnicoPlantilla, textoHumanoDePlantilla } from "./components/whatsapp-thread-list/plantillas-humanas";
import { esRutaDeMedia } from "./adjuntos/adjuntos.util";

const KINDS_MEDIA: ReadonlySet<string> = new Set(["image", "audio", "video", "document", "sticker"]);

/** Tipo del mensaje que manda WhatsApp (o Kapso) → tipo que pinta el chat. */
const TIPOS_MEDIA: Record<string, WhatsappMessageType> = {
  image: "image",
  photo: "image",
  audio: "audio",
  voice: "audio",
  ptt: "audio",
  video: "video",
  document: "document",
  file: "document",
  sticker: "sticker",
  location: "location",
};

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
 *   GET    /v1/whatsapp/conversations                    ?search=&status=&page=&pageSize=&lineId=
 *   GET    /v1/whatsapp/conversations/:phoneHash/messages ?lineId=
 *   GET    /v1/whatsapp/conversations/:phoneHash/profile  ?lineId=
 *   GET    /v1/whatsapp/conversations/:phoneHash/orders   ?lineId=
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/viewed   ?lineId=
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/rating   ?lineId=  { score }
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/optout   ?lineId=  { optedOut }
 *   POST   /v1/whatsapp/conversations/:phoneHash/reply    ?lineId=  { text, clientMessageId }
 *          (bandeja única: también multipart con `file`, `text`, `clientMessageId`, `kind`, `durationSec`)
 *   GET    /v1/whatsapp/conversations/:phoneHash/media/:docId ?lineId=  (bandeja única: el archivo, como blob)
 *   GET    /v1/whatsapp/conversations/:phoneHash/bot      ?lineId=
 *   POST   /v1/whatsapp/conversations/:phoneHash/bot/{tomar,devolver} ?lineId=
 *   POST   /v1/whatsapp/conversations/:phoneHash/crm-lead ?lineId=  (si el servidor aún no la tiene: /v1/crm/leads/import)
 *   GET    /v1/whatsapp/conversations/bot/sesiones
 *   POST   /v1/whatsapp/sync-inbound
 *   GET    /v1/whatsapp/kapso-templates
 *   POST   /v1/whatsapp/start-conversation
 */
@Injectable({ providedIn: "root" })
export class WhatsappInboxService extends BaseService {
  private readonly base = "/v1/whatsapp/conversations";

  constructor(http: HttpClient, private translate: TranslateService) {
    super(http);
  }

  /** Listado de hilos. Con `lineId`, solo los chats de ese número. */
  getThreads(
    opts: {
      search?: string;
      status?: "all" | "unread";
      page?: number;
      /** Chats por página (el servidor usa 20 y topa en 100). */
      pageSize?: number;
      lineId?: string | null;
    } = {},
  ): Observable<ThreadsPage> {
    const search = (opts.search || "").trim();
    const params: Record<string, string | null | undefined> = {
      search: search || null,
      status: opts.status && opts.status !== "all" ? opts.status : null,
      page: opts.page && opts.page > 1 ? String(opts.page) : null,
      pageSize: opts.pageSize && opts.pageSize > 0 ? String(Math.min(100, Math.floor(opts.pageSize))) : null,
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
        return { items, hasMore: !!response?.hasMore, ventana: this.adaptarVentana(response?.ventana) };
      }),
    );
  }

  /** Perfil del contacto (cabecera del chat y panel derecho). */
  getContactProfile(phoneHash: string, lineId?: string | null): Observable<ContactProfile> {
    return this.get<any>(this.rutaChat(phoneHash, "/profile", lineId)).pipe(
      map((p: any) => ({
        phoneHash: p?.phoneHash || phoneHash,
        // Sin número, vacío: la cabecera usa el de la fila o «Contacto», nunca signos de pregunta.
        phoneMasked: p?.phoneMasked || "",
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

  /**
   * Bandeja única: envía un archivo (foto, PDF, video, audio o nota de voz) con la misma ruta del texto, en
   * multipart. Devuelve los eventos de la subida (`reportProgress`) para pintar «Subiendo X %»; cancelar la
   * suscripción corta la subida. Sin pantalla de carga global: el chat muestra su propio avance.
   */
  enviarAdjunto(phoneHash: string, form: FormData, lineId?: string | null): Observable<HttpEvent<any>> {
    const url = `${environment.urlApi}${this.rutaChat(phoneHash, "/reply", lineId)}`;
    const req = new HttpRequest("POST", url, form, {
      reportProgress: true,
      context: new HttpContext().set(SKIP_LOADER, true),
    });
    return this.http.request<any>(req);
  }

  /**
   * Bandeja única: baja el archivo de un mensaje como blob, con la sesión (la ruta la arma el servidor). Solo
   * se piden rutas de archivos del chat (`/v1/whatsapp/conversations/<hash>/media/<id>`): el interceptor le pone
   * la sesión a cualquier dirección del backend, así que una ruta rara no se pide. Sin pantalla de carga ni
   * avisos sueltos: el chat dice qué pasó con cada archivo (410 vencido, 404 no disponible, 5xx reintentar).
   */
  descargarAdjunto(ruta: string): Observable<Blob> {
    if (!esRutaDeMedia(ruta)) {
      return throwError(() => new HttpErrorResponse({ status: 404, statusText: "ruta_no_valida" }));
    }
    return this.http.get(`${environment.urlApi}${ruta}`, {
      responseType: "blob",
      context: new HttpContext().set(SKIP_LOADER, true).set(SIN_AVISO_NEGOCIO, true),
    });
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

  /**
   * Guarda el contacto del chat como lead en el CRM de Katuq. El front no conoce el teléfono completo (solo el
   * enmascarado), así que lo resuelve el servidor desde el chat (`/:phoneHash/crm-lead`, que respeta el alcance
   * por número). Mientras el servidor no tenga esa ruta (404), se guarda como antes pero SIN teléfono: nunca un
   * número inventado a partir del enmascarado.
   */
  guardarLeadEnCrm(phoneHash: string, lineId: string | null, body: Record<string, unknown>): Observable<any> {
    const sinTelefono = { ...body, phone: null, phoneNormalized: null, whatsappPhoneHash: phoneHash };
    return this.post<any>(this.rutaChat(phoneHash, "/crm-lead", lineId), body).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return this.post<any>("/v1/crm/leads/import", sinTelefono);
        }
        throw err;
      }),
    );
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

  /**
   * «Enviar plantilla» desde un chat abierto, cuando ya pasaron 24 horas: el servidor resuelve el teléfono real
   * desde el chat (el front solo conoce el enmascarado) y envía con la misma lógica de `start-conversation`
   * (no contactar, dueño del chat con `?lineId=`, saldo). Body `{templateName, languageCode, variables}`.
   * Sin pantalla de carga ni aviso «Suscripción» del interceptor: la ventana del chat explica cada rechazo por
   * su código (402 INSUFFICIENT_BALANCE o ACCOUNT_NOT_ACTIVE, 422 opted_out o invalid_variables, 409
   * CHAT_CON_DUENO, 403 FUERA_DE_ALCANCE, 503 OPTOUT_UNAVAILABLE, SALDO_NO_DISPONIBLE o LINE_LOOKUP_FAILED, 400
   * send_failed, 429 RATE_LIMIT_EXCEEDED). Un 401 de sesión sigue cerrando la sesión.
   */
  enviarPlantillaAlChat(
    phoneHash: string,
    lineId: string | null | undefined,
    body: { templateName: string; languageCode: string; variables: string[] },
  ): Observable<{ success?: boolean; balanceAfter?: number }> {
    return this.postSinLoader<{ success?: boolean; balanceAfter?: number }>(
      this.rutaChat(phoneHash, "/plantilla", lineId),
      body,
      { context: new HttpContext().set(SIN_AVISO_NEGOCIO, true) },
    );
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
      // Sin nombre, vacío: la lista muestra el número enmascarado (y no varias filas iguales «Sin nombre»).
      contactName: String(it.clienteNombre || it.profileName || "").trim(),
      lastMessageAt: it.lastMessageAt,
      lastMessageSnippet: it.lastMessagePreview || it.lastMessageSnippet || "",
      unreadCount: it.unreadCount || 0,
      lastDirection: it.lastMessageDirection || it.lastDirection || "outbound",
      messageCount: it.totalMessages || it.messageCount || 0,
      flags: it.flags,
      threadId: it.threadId || null,
      line: it.line && it.line.id ? it.line : null,
      owner: it.owner && it.owner.email ? it.owner : null,
      colaId: it.colaId || null,
      // [D-728] Solo llegan con la bandeja única; sin ellos el chat queda abierto y sin etiquetas.
      cerrado: it.cerrado === true,
      motivoCierre: it.motivoCierre || null,
      etiquetas: Array.isArray(it.etiquetas) ? it.etiquetas : [],
    };
  }

  /**
   * El backend devuelve otra forma (templateName, textPreview, timestamp); se
   * pasa a `WhatsappMessage`. Los del bot de pedidos llegan como BOT_REPLY y el
   * chat les pinta la marca.
   *
   * - Una foto, audio, video o documento sin texto se marca con `mediaPlaceholder`
   *   y el chat dice «Imagen», «Audio»… en vez de una burbuja vacía (todavía no
   *   se ve el archivo).
   * - Un aviso automático sin texto dice lo que es («Recibimos tu pedido») y no
   *   «[katuq_order_created_v2]»; tampoco sale el tipo interno (REPLY_INBOUND…).
   */
  private adaptarMensaje(m: any): WhatsappMessage {
    const entrante = m.direction === "inbound";
    const crudo = String(m.messageType || m.type || "").toLowerCase();
    const tipo: WhatsappMessageType = (entrante && TIPOS_MEDIA[crudo]) || "text";
    const plantilla = m.templateName ? String(m.templateName) : "";
    const traducir = (clave: string) => this.translate.instant(clave);
    const humano = (t: string) => (t && esNombreTecnicoPlantilla(t) ? textoHumanoDePlantilla(t, traducir) : t);
    const propio = String(m.text || m.body || "").trim();
    let texto = propio || String(m.textPreview || "").trim();
    if (!propio && !entrante) {
      texto = plantilla ? textoHumanoDePlantilla(plantilla, traducir) : humano(texto);
    } else if (!propio) {
      texto = humano(texto);
    }
    // Bandeja única: el archivo y la ubicación se pintan en la burbuja; el texto es solo el que los acompaña.
    const adjuntos = this.adaptarAdjuntos(m.adjuntos);
    const ubicacion = entrante ? this.adaptarUbicacion(m.ubicacion) : null;
    if (adjuntos.length || ubicacion) {
      texto = String(m.text || m.body || adjuntos[0]?.caption || "").trim();
    }
    const tipoFinal: WhatsappMessageType = adjuntos.length ? adjuntos[0].kind : ubicacion ? "location" : tipo;
    // Entrante sin texto (foto sin pie, nota de voz, ubicación…): se dice qué llegó, nunca una burbuja vacía.
    const sinTexto = !texto && !adjuntos.length && !ubicacion;
    return {
      id: m.id,
      direction: entrante ? "inbound" : "outbound",
      esBot: String(m.type || "") === "BOT_REPLY",
      sentBy: m.sentBy || null,
      sentByName: m.sentByName || null,
      type: tipoFinal,
      body: texto,
      snippet: texto,
      sentAt: m.timestamp || m.sentAt || m.receivedAt || new Date().toISOString(),
      status: m.status || (entrante ? "delivered" : "sent"),
      mediaPlaceholder: sinTexto,
      plantilla: plantilla || null,
      // Un envío fallido que el servidor guardó sin su texto llega con una etiqueta («Respuesta enviada»):
      // ese no se reintenta, porque saldría al cliente un texto que nadie escribió.
      textoReintentable: !entrante && !!propio && String(m.type || "") === "REPLY_INBOUND",
      ...(adjuntos.length ? { adjuntos } : {}),
      ...(ubicacion ? { ubicacion } : {}),
    };
  }

  /** Archivos del mensaje (solo llegan con la bandeja única). Se descarta lo que no tenga la forma esperada. */
  private adaptarAdjuntos(crudo: unknown): MediaInfo[] {
    if (!Array.isArray(crudo)) return [];
    const out: MediaInfo[] = [];
    for (const a of crudo) {
      if (!a || typeof a !== "object" || !KINDS_MEDIA.has(String(a.kind)) || typeof a.id !== "string") continue;
      const bytes = Number(a.bytes);
      out.push({
        id: a.id,
        kind: a.kind as MediaKind,
        mime: typeof a.mime === "string" ? a.mime : null,
        bytes: Number.isFinite(bytes) && bytes > 0 ? bytes : null,
        filename: typeof a.filename === "string" && a.filename.trim() ? a.filename.trim() : null,
        voice: a.voice === true,
        caption: typeof a.caption === "string" && a.caption.trim() ? a.caption : null,
        // Sin una ruta válida no se puede bajar: se muestra como no disponible.
        disponible: a.disponible === true && esRutaDeMedia(a.url),
        ...(a.motivo === "vencido" || a.motivo === "compartido" || a.motivo === "sin_archivo"
          ? { motivo: a.motivo }
          : a.disponible === true && !esRutaDeMedia(a.url)
          ? { motivo: "sin_archivo" as const }
          : {}),
        url: typeof a.url === "string" ? a.url : "",
      });
      if (out.length >= 1) break; // WhatsApp: un archivo por mensaje
    }
    return out;
  }

  private adaptarUbicacion(u: any): UbicacionMensaje | null {
    if (!u || typeof u !== "object") return null;
    const lat = Number(u.lat);
    const lng = Number(u.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    return { lat, lng, nombre: texto(u.nombre), direccion: texto(u.direccion) };
  }

  private adaptarVentana(v: any): VentanaChat | null {
    if (!v || typeof v !== "object" || typeof v.abierta !== "boolean") return null;
    return { abierta: v.abierta, cierraEn: typeof v.cierraEn === "string" ? v.cierraEn : null };
  }
}
