import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { BaseService } from '../base.service';
import { DuenoChat } from './messaging.models';

/**
 * Dueño del chat (D-437): tomar, soltar y pasar. El servidor decide por
 * transacción; si el chat ya tiene otro dueño responde 409 `CHAT_CON_DUENO`
 * (ver `esErrorChatConDueno`). No depende del canal.
 */
@Injectable({ providedIn: 'root' })
export class MessagingThreadsService extends BaseService {
  private readonly base = '/v1/messaging/threads';

  constructor(http: HttpClient) {
    super(http);
  }

  tomar(threadId: string): Observable<DuenoChat | null> {
    return this.accion(threadId, 'tomar', {});
  }

  soltar(threadId: string): Observable<DuenoChat | null> {
    return this.accion(threadId, 'soltar', {});
  }

  /** Solo la familia Administrador; el destino debe ser del comercio. */
  asignar(threadId: string, email: string): Observable<DuenoChat | null> {
    return this.accion(threadId, 'asignar', { email });
  }

  private accion(threadId: string, accion: string, body: object): Observable<DuenoChat | null> {
    return this.post<{ owner: DuenoChat | null }>(
      `${this.base}/${encodeURIComponent(threadId)}/${accion}`,
      body,
    ).pipe(map((res) => res?.owner || null));
  }
}
