// MOCK SERVICE — datos hardcoded para demo. Cuando 009.1/009.2/009.4 estén
// implementados, cambiar of(mock) por this.get(endpoint).

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { delay } from "rxjs/operators";

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
 * Extiende `BaseService` para mantener consistencia con el resto del proyecto
 * y para que, cuando los endpoints reales existan, cambiar `of(mock)` por
 * `this.get(...)` sea un cambio de una línea por método.
 *
 * Endpoints futuros (NO existen aún):
 *   GET    /v1/whatsapp-inbox/threads
 *   GET    /v1/whatsapp-inbox/threads/:phoneHash/messages
 *   GET    /v1/whatsapp-inbox/contacts/:phoneHash/profile
 *   GET    /v1/whatsapp-inbox/contacts/:phoneHash/orders
 *   POST   /v1/whatsapp-inbox/threads/:phoneHash/viewed
 *   POST   /v1/whatsapp-inbox/contacts/:phoneHash/rating
 */
@Injectable()
export class WhatsappInboxService extends BaseService {
  /** Latencia simulada para que la UI muestre los spinners durante la demo. */
  private readonly MOCK_DELAY_MS = 180;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Listado paginado de hilos.
   * MOCK: filtra en memoria por `search` (contactName o snippet) y por `status`
   * (todos | unread). Pagina por bloques de 20.
   */
  getThreads(
    opts: { search?: string; status?: "all" | "unread"; page?: number } = {},
  ): Observable<ThreadsPage> {
    const search = (opts.search || "").trim().toLowerCase();
    const status = opts.status || "all";
    const page = Math.max(1, opts.page || 1);
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

    // Orden descendente por última actividad.
    items.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    const hasMore = start + pageItems.length < totalCount;

    const response: ThreadsPage = {
      items: pageItems,
      totalCount,
      hasMore,
      nextCursor: hasMore ? String(page + 1) : undefined,
    };
    return of(response).pipe(delay(this.MOCK_DELAY_MS));
    // FUTURO: return this.get<ThreadsPage>(`/v1/whatsapp-inbox/threads?search=${...}&status=${...}&page=${page}`);
  }

  /** Mensajes de un hilo. MOCK: orden ascendente, sin paginación real. */
  getMessages(phoneHash: string): Observable<MessagesPage> {
    const items = DEMO_MESSAGES[phoneHash] || [];
    const sorted = [...items].sort((a, b) =>
      a.sentAt < b.sentAt ? -1 : 1,
    );
    const response: MessagesPage = { items: sorted, hasMore: false };
    return of(response).pipe(delay(this.MOCK_DELAY_MS));
    // FUTURO: return this.get<MessagesPage>(`/v1/whatsapp-inbox/threads/${phoneHash}/messages`);
  }

  /** Perfil de contacto (panel derecho — 009.5.1). */
  getContactProfile(phoneHash: string): Observable<ContactProfile> {
    const profile =
      DEMO_PROFILES[phoneHash] || {
        phoneHash,
        phoneMasked: "+??***????",
        isClienteRegistrado: false,
        lead: null,
        ratingDraft: null,
      };
    return of(profile).pipe(delay(this.MOCK_DELAY_MS));
    // FUTURO: return this.get<ContactProfile>(`/v1/whatsapp-inbox/contacts/${phoneHash}/profile`);
  }

  /** Pedidos del contacto (panel derecho — 009.5.1). */
  getContactOrders(phoneHash: string): Observable<Order[]> {
    const orders = DEMO_ORDERS[phoneHash] || [];
    return of(orders).pipe(delay(this.MOCK_DELAY_MS));
    // FUTURO: return this.get<Order[]>(`/v1/whatsapp-inbox/contacts/${phoneHash}/orders`);
  }

  /** Marcar hilo como visto por el operador. MOCK: siempre OK. */
  markThreadViewed(phoneHash: string): Observable<{ updated: number }> {
    // Mantengo `phoneHash` en la firma para que el componente llame con el
    // mismo argumento que usará el endpoint real.
    void phoneHash;
    return of({ updated: 1 }).pipe(delay(this.MOCK_DELAY_MS));
    // FUTURO: return this.post<{updated: number}>(`/v1/whatsapp-inbox/threads/${phoneHash}/viewed`, {});
  }

  /** Calificar contacto (1-5). MOCK: devuelve el score recibido. */
  rateContact(
    phoneHash: string,
    score: number,
  ): Observable<{ score: number }> {
    void phoneHash;
    return of({ score }).pipe(delay(this.MOCK_DELAY_MS));
    // FUTURO: return this.post<{score: number}>(`/v1/whatsapp-inbox/contacts/${phoneHash}/rating`, { score });
  }
}
