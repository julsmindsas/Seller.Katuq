import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BaseService } from '../base.service';
import {
  AjustesAtencion,
  ColaAtencion,
  ColasAtencion,
  DuenoChat,
  EstadoAsesor,
  HiloAtencion,
  MiembroAtencion,
  NotaChat,
  ResumenAtencion,
  Transferencia,
  YoAtencion,
} from './messaging.models';

/**
 * Atención multiagente de la bandeja única (D-725). Las rutas solo existen con la
 * bandera `bandejaUnica` del comercio; el servidor decide los permisos (403).
 * Los errores 409 `CHAT_CON_DUENO` se leen con `esErrorChatConDueno`.
 */
@Injectable({ providedIn: 'root' })
export class AtencionService extends BaseService {
  private readonly base = '/v1/messaging/atencion';

  constructor(http: HttpClient) {
    super(http);
  }

  yo(): Observable<YoAtencion> {
    return this.get<YoAtencion>(`${this.base}/yo`);
  }

  cambiarEstado(estado: EstadoAsesor): Observable<EstadoAsesor> {
    return this.put<{ estado: EstadoAsesor }>(`${this.base}/yo/estado`, { estado }).pipe(
      map((res) => res?.estado || estado),
    );
  }

  equipo(): Observable<MiembroAtencion[]> {
    return this.get<{ equipo: MiembroAtencion[] }>(`${this.base}/equipo`).pipe(
      map((res) => res?.equipo || []),
    );
  }

  /** Solo quien coordina (si no, 403). */
  resumen(): Observable<ResumenAtencion> {
    return this.get<ResumenAtencion>(`${this.base}/resumen`);
  }

  /** GET: quien coordina. */
  ajustes(): Observable<AjustesAtencion> {
    return this.get<AjustesAtencion>(`${this.base}/ajustes`);
  }

  /** PUT: solo el administrador. */
  guardarAjustes(ajustes: AjustesAtencion): Observable<AjustesAtencion> {
    return this.put<AjustesAtencion>(`${this.base}/ajustes`, ajustes);
  }

  /** Dueño, notas e historial. Un 404 se entrega como sin dueño y sin notas. */
  hilo(threadId: string): Observable<HiloAtencion> {
    return this.get<HiloAtencion>(this.ruta(threadId)).pipe(
      catchError((err) =>
        err?.status === 404
          ? of({ threadId, owner: null, notas: [], log: [] } as HiloAtencion)
          : throwError(() => err),
      ),
    );
  }

  tomar(threadId: string): Observable<DuenoChat | null> {
    return this.accion(threadId, 'tomar', {});
  }

  soltar(threadId: string): Observable<DuenoChat | null> {
    return this.accion(threadId, 'soltar', {});
  }

  /** Quien coordina. Un correo vacío quita el dueño. */
  asignar(threadId: string, email: string): Observable<DuenoChat | null> {
    return this.accion(threadId, 'asignar', { email });
  }

  /**
   * El dueño o quien coordina; la nota es opcional (máx. 300). Se pasa a una persona (`email`) o a una
   * cola (`colaId`), nunca a las dos. La forma `(threadId, email, nota)` se conserva.
   */
  transferir(
    threadId: string,
    destino: string | Pick<Transferencia, 'email' | 'colaId' | 'nota'>,
    nota = '',
  ): Observable<DuenoChat | null> {
    if (typeof destino === 'string') return this.accion(threadId, 'transferir', { email: destino, nota });
    const cuerpo: { email?: string; colaId?: string; nota: string } = { nota: destino.nota || '' };
    if (destino.colaId) cuerpo.colaId = destino.colaId;
    else if (destino.email) cuerpo.email = destino.email;
    return this.accion(threadId, 'transferir', cuerpo);
  }

  /** Todos: colas (completas para quien coordina) y los números y cuentas que se pueden meter en una. */
  colas(): Observable<ColasAtencion> {
    return this.get<ColasAtencion>(`${this.base}/colas`).pipe(
      map((res) => ({ colas: res?.colas || [], lineas: res?.lineas || [] })),
    );
  }

  /** PUT: solo el administrador. Envía la lista completa; un 422 trae el mensaje en `error.message`. */
  guardarColas(colas: ColaAtencion[]): Observable<ColaAtencion[]> {
    return this.put<{ colas: ColaAtencion[] }>(`${this.base}/colas`, { colas }).pipe(
      map((res) => res?.colas || []),
    );
  }

  agregarNota(threadId: string, texto: string, menciones: string[] = []): Observable<NotaChat> {
    return this.post<{ nota: NotaChat }>(`${this.ruta(threadId)}/notas`, { texto, menciones }).pipe(
      map((res) => res.nota),
    );
  }

  private ruta(threadId: string): string {
    return `${this.base}/threads/${encodeURIComponent(threadId)}`;
  }

  private accion(threadId: string, accion: string, body: object): Observable<DuenoChat | null> {
    return this.post<{ owner: DuenoChat | null }>(`${this.ruta(threadId)}/${accion}`, body).pipe(
      map((res) => res?.owner || null),
    );
  }
}
