// Service real con fallback graceful al mock. Si endpoint no existe (404) o
// retorna vacío, cae al demo data. Mantiene el demo funcional aunque los
// endpoints reales del backend (spec 009.1/009.2/009.4) todavía no estén
// desplegados, y migra automáticamente cuando empiecen a responder.

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, delay, map, retry } from "rxjs/operators";

import { environment } from "../../../../environments/environment";
import { BaseService } from "../../../shared/services/base.service";
import {
  ContactProfile,
  MessagesPage,
  Order,
  ThreadsPage,
  WhatsappThread,
} from "./models/whatsapp-thread.model";
import {
  DEMO_MESSAGES,
  DEMO_ORDERS,
  DEMO_PROFILES,
  DEMO_THREADS,
} from "./data/demo-threads.data";

/**
 * Servicio del módulo WhatsApp Inbox (spec 009).
 *
 * Extiende `BaseService` para que el interceptor HTTP del proyecto
 * (`HttpInterceptor2`) adjunte automáticamente `Authorization`, `company` y
 * `usage-code` en cada request. No usa `HttpClient` directo — Art IX.
 *
 * Estrategia de fallback graceful:
 *   1. Intenta llamar al endpoint real.
 *   2. Si retorna 404/500/cualquier error, cae al mock con `catchError`.
 *   3. Si responde 200 pero con lista vacía, cae al mock vía `map`.
 *
 * Endpoints reales:
 *   GET    /v1/whatsapp/conversations
 *   GET    /v1/whatsapp/conversations/:phoneHash/messages
 *   GET    /v1/whatsapp/conversations/:phoneHash/profile
 *   GET    /v1/whatsapp/conversations/:phoneHash/orders
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/viewed
 *   PATCH  /v1/whatsapp/conversations/:phoneHash/rating  { score }
 */
@Injectable()
export class WhatsappInboxService extends BaseService {
  /** Latencia simulada para que el fallback al mock muestre los spinners. */
  private readonly MOCK_DELAY_MS = 180;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Listado paginado de hilos.
   *
   * Real: `GET /v1/whatsapp/conversations?search=&status=&page=`.
   * Fallback: filtra `DEMO_THREADS` en memoria por `search` y `status`,
   * pagina por bloques de 20.
   */
  getThreads(
    opts: { search?: string; status?: "all" | "unread"; page?: number } = {},
  ): Observable<ThreadsPage> {
    const search = (opts.search || "").trim().toLowerCase();
    const status = opts.status || "all";
    const page = Math.max(1, opts.page || 1);

    const mock = this.buildMockThreadsPage(search, status, page);
    const params: string[] = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (status !== "all") params.push(`status=${status}`);
    params.push(`page=${page}`);
    const qs = params.length ? `?${params.join("&")}` : "";

    // eslint-disable-next-line no-console
    console.log('[WA-INBOX] getThreads CALLED with qs=', qs);
    return this.get<ThreadsPage>(`/v1/whatsapp/conversations${qs}`).pipe(
      map((response: any) => {
        // eslint-disable-next-line no-console
        console.log('[WA-INBOX] getThreads RAW response:', response);
        const items = response?.items || [];
        if (items.length === 0) return mock;
        // Adaptador: el backend retorna shape distinto al ThreadsPage del frontend.
        const adapted: ThreadsPage = {
          items: items.map((it: any) => ({
            phoneHash: it.phoneHash,
            phoneMasked: it.phoneMasked,
            contactName: it.clienteNombre || it.profileName || "Sin nombre",
            lastMessageAt: it.lastMessageAt,
            lastMessageSnippet: it.lastMessagePreview || it.lastMessageSnippet || "",
            unreadCount: it.unreadCount || 0,
            lastDirection: it.lastMessageDirection || it.lastDirection || "outbound",
            messageCount: it.totalMessages || it.messageCount || 0,
            flags: it.flags,
          })),
          totalCount: response.totalCount ?? items.length,
          hasMore: response.hasMore ?? false,
          nextCursor: response.nextCursor,
        };
        return adapted;
      }),
      catchError((err) => {
        // eslint-disable-next-line no-console
        console.warn('[WA-INBOX] getThreads ERROR → fallback mock:', err?.status, err?.message);
        return of(mock).pipe(delay(this.MOCK_DELAY_MS));
      }),
    );
  }

  /**
   * Mensajes de un hilo.
   *
   * Real: `GET /v1/whatsapp/conversations/:phoneHash/messages`.
   * Fallback: `DEMO_MESSAGES[phoneHash]` ordenado ascendente.
   */
  getMessages(phoneHash: string): Observable<MessagesPage> {
    const mock = this.buildMockMessagesPage(phoneHash);

    return this.get<any>(
      `/v1/whatsapp/conversations/${encodeURIComponent(phoneHash)}/messages`,
    ).pipe(
      map((response: any) => {
        const raw = response?.items || [];
        if (raw.length === 0) return mock;
        // Adapter: el backend devuelve shape distinto al frontend (templateName,
        // textPreview, timestamp, wamid). Mapeamos a WhatsappMessage del modelo.
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
            type: (m.type || "text").toString().toLowerCase().includes("text")
              ? "text"
              : "text",
            body:
              m.text ||
              m.body ||
              m.textPreview ||
              (m.templateName ? `[${m.templateName}]` : ""),
            snippet:
              m.textPreview || m.text || m.body ||
              (m.templateName ? `[${m.templateName}]` : ""),
            sentAt: m.timestamp || m.sentAt || m.receivedAt || new Date().toISOString(),
            status: m.status || (m.direction === "inbound" ? "delivered" : "sent"),
            mediaPlaceholder: false,
          }));
        return { items, hasMore: response.hasMore || false } as MessagesPage;
      }),
      catchError(() => of(mock).pipe(delay(this.MOCK_DELAY_MS))),
    );
  }

  /**
   * Perfil de contacto (panel derecho — 009.5.1).
   *
   * Real: `GET /v1/whatsapp/conversations/:phoneHash/profile`.
   * Fallback: `DEMO_PROFILES[phoneHash]` o perfil vacío con phoneHash.
   */
  getContactProfile(phoneHash: string): Observable<ContactProfile> {
    const mock = this.buildMockProfile(phoneHash);

    return this.get<ContactProfile>(
      `/v1/whatsapp/conversations/${encodeURIComponent(phoneHash)}/profile`,
    ).pipe(
      map((response: ContactProfile) =>
        response && response.phoneHash ? response : mock,
      ),
      catchError(() => of(mock).pipe(delay(this.MOCK_DELAY_MS))),
    );
  }

  /**
   * Pedidos del contacto (panel derecho — 009.5.1).
   *
   * Real: `GET /v1/whatsapp/conversations/:phoneHash/orders`.
   * Fallback: `DEMO_ORDERS[phoneHash]`.
   *
   * El backend puede responder como `Order[]` directo o como `{ items: Order[] }`.
   * Toleramos ambos shapes para no romper la migración futura.
   */
  getContactOrders(phoneHash: string): Observable<Order[]> {
    const mock: Order[] = DEMO_ORDERS[phoneHash] || [];

    return this.get<Order[] | { items: Order[] }>(
      `/v1/whatsapp/conversations/${encodeURIComponent(phoneHash)}/orders`,
    ).pipe(
      map((response: Order[] | { items: Order[] }) => {
        const items: Order[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.items)
          ? response.items
          : [];
        return items.length > 0 ? items : mock;
      }),
      catchError(() => of(mock).pipe(delay(this.MOCK_DELAY_MS))),
    );
  }

  /**
   * Marcar hilo como visto por el operador.
   *
   * Real: `PATCH /v1/whatsapp/conversations/:phoneHash/viewed`.
   *
   * [D-105] SIN fallback mock: el mock fingía éxito y enmascaró fallos reales
   * (el CORS sin PATCH de D-095 vivió semanas gracias a esto). Ahora: 1 retry
   * a los 2s y si aún falla se loguea FUERTE en consola — el badge se
   * "resucita" en el próximo poll de la lista, que es el comportamiento
   * honesto (el hilo sigue sin leer en el servidor).
   *
   * Usamos `http.patch` directo porque `BaseService` no expone `patch`, pero
   * el `HttpClient` inyectado ya pasa por el interceptor del proyecto.
   */
  markThreadViewed(phoneHash: string): Observable<{ updated: number }> {
    const url = `${environment.urlApi}/v1/whatsapp/conversations/${encodeURIComponent(
      phoneHash,
    )}/viewed`;

    return this.http.patch<{ updated: number }>(url, {}).pipe(
      retry({ count: 1, delay: 2000 }),
      map((response: { updated: number }) =>
        response && typeof response.updated === "number"
          ? response
          : { updated: 0 },
      ),
      catchError((err) => {
        // eslint-disable-next-line no-console
        console.error(
          `[whatsapp-inbox] markThreadViewed FALLÓ para ${phoneHash.slice(0, 12)}… — el hilo seguirá como no-leído`,
          err?.status || err?.message || err,
        );
        return of({ updated: 0 });
      }),
    );
  }

  /**
   * Enviar respuesta al hilo (composer del comercio).
   *
   * Real: `POST /v1/whatsapp/conversations/:phoneHash/reply` body `{ text }`.
   *
   * Usamos `fetch` directo (no `BaseService.post`) por el mismo motivo que
   * `getThreads` del thread-list: el HttpInterceptor cacheado por el HMR de
   * Angular 14 puede no inyectar headers correctamente en endpoints nuevos
   * agregados en caliente. Adjuntamos manualmente todos los headers que
   * `HttpInterceptor2` agregaría (Authorization, company, user, email, usage-code).
   */
  sendReply(
    phoneHash: string,
    text: string,
  ): Promise<{ id?: string; sentAt?: string; status?: string }> {
    const userStr = localStorage.getItem("user") || "{}";
    let token = "";
    let company = "";
    let nit = "";
    let email = "";
    let authCode = "";
    try {
      const u = JSON.parse(userStr);
      token = u.token || "";
      company = u.company || "";
      nit = u.nit || "";
      email = u.email || "";
      authCode = u.authorizationCode || "";
    } catch {
      // ignore — fallback a strings vacías; el backend rechazará con 401
    }
    const headers: HeadersInit = {
      Authorization: "Bearer " + token,
      company,
      user: nit,
      "usage-code": authCode,
      email,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const url =
      `${environment.urlApi}/v1/whatsapp/conversations/` +
      `${encodeURIComponent(phoneHash)}/reply`;
    return fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text }),
    }).then((r) => {
      if (!r.ok) {
        return r
          .text()
          .then((body) =>
            Promise.reject(new Error(`HTTP ${r.status}: ${body || r.statusText}`)),
          );
      }
      return r.json().catch(() => ({}));
    });
  }

  /**
   * Calificar contacto (1-5).
   *
   * Real: `PATCH /v1/whatsapp/conversations/:phoneHash/rating` body `{ score }`.
   * Fallback: devuelve el `score` recibido para que la UI optimista quede igual.
   */
  rateContact(
    phoneHash: string,
    score: number,
  ): Observable<{ score: number }> {
    const url = `${environment.urlApi}/v1/whatsapp/conversations/${encodeURIComponent(
      phoneHash,
    )}/rating`;
    const mock: { score: number } = { score };

    return this.http.patch<{ score: number }>(url, { score }).pipe(
      map((response: { score: number }) =>
        response && typeof response.score === "number" ? response : mock,
      ),
      catchError(() => of(mock).pipe(delay(this.MOCK_DELAY_MS))),
    );
  }

  // ------------------------------------------------------------------
  // Helpers privados para construir los payloads de fallback (mock).
  // ------------------------------------------------------------------

  private buildMockThreadsPage(
    search: string,
    status: "all" | "unread",
    page: number,
  ): ThreadsPage {
    const pageSize = 20;
    let items: WhatsappThread[] = [...DEMO_THREADS];

    if (search) {
      items = items.filter(
        (t) =>
          t.contactName.toLowerCase().includes(search) ||
          t.lastMessageSnippet.toLowerCase().includes(search) ||
          t.phoneMasked.toLowerCase().includes(search),
      );
    }
    if (status === "unread") {
      items = items.filter((t) => t.unreadCount > 0);
    }

    items.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const hasMore = start + pageItems.length < totalCount;

    return {
      items: pageItems,
      totalCount,
      hasMore,
      nextCursor: hasMore ? String(page + 1) : undefined,
    };
  }

  private buildMockMessagesPage(phoneHash: string): MessagesPage {
    const items = DEMO_MESSAGES[phoneHash] || [];
    const sorted = [...items].sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));
    return { items: sorted, hasMore: false };
  }

  private buildMockProfile(phoneHash: string): ContactProfile {
    return (
      DEMO_PROFILES[phoneHash] || {
        phoneHash,
        phoneMasked: "+??***????",
        isClienteRegistrado: false,
        lead: null,
        ratingDraft: null,
      }
    );
  }
}
