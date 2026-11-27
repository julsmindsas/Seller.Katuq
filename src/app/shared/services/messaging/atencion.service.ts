import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BaseService } from '../base.service';
import {
  AccionHilo,
  AyudaOpttia,
  AjustesAtencion,
  CatalogosAtencion,
  ColaAtencion,
  ColasAtencion,
  DuenoChat,
  EstadoAsesor,
  FiltrosInformeAtencion,
  HiloAtencion,
  InformeAtencion,
  MiembroAtencion,
  NotaChat,
  CanalRelacionados,
  RelacionadosRespuesta,
  ResumenAtencion,
  TipoAyudaOpttia,
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

  /** Informe de atención (D-729). Solo quien coordina (si no, 403); rango inválido = 422. Solo lectura. */
  informe(filtros: FiltrosInformeAtencion = {}): Observable<InformeAtencion> {
    const partes: string[] = [];
    Object.entries(filtros).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      partes.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    });
    const qs = partes.length ? `?${partes.join('&')}` : '';
    return this.getSinLoader<InformeAtencion>(`${this.base}/informe${qs}`);
  }

  /**
   * Otros chats del mismo cliente (solo lectura). Un 404 es igual si el chat no existe o la persona no puede
   * verlo; 429 es el freno de frecuencia. `lineId` solo en WhatsApp con número propio.
   */
  relacionados(canal: CanalRelacionados, hash: string, lineId?: string | null): Observable<RelacionadosRespuesta> {
    let qs = `canal=${encodeURIComponent(canal)}&hash=${encodeURIComponent(hash)}`;
    if (canal === 'whatsapp' && lineId) qs += `&lineId=${encodeURIComponent(lineId)}`;
    return this.getSinLoader<RelacionadosRespuesta>(`${this.base}/relacionados?${qs}`).pipe(
      map((res) => ({
        ancla: res?.ancla ?? null,
        motivo: res?.motivo,
        items: Array.isArray(res?.items) ? res.items : [],
      })),
    );
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
          ? of({ threadId, owner: null, notas: [], log: [], cierre: null, etiquetas: [] } as HiloAtencion)
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

  /** Todos los que usan la bandeja: motivos de cierre, horas de cierre automático, etiquetas y respuestas rápidas. */
  catalogos(): Observable<CatalogosAtencion> {
    return this.get<Partial<CatalogosAtencion>>(`${this.base}/catalogos`).pipe(
      map((res) => ({
        motivosCierre: res?.motivosCierre || [],
        cierreAutoHoras: Number(res?.cierreAutoHoras) || 0,
        etiquetas: res?.etiquetas || [],
        rapidos: res?.rapidos || [],
      })),
    );
  }

  /** PUT: solo el administrador. Cuerpo parcial; un 422 trae el mensaje en `error.message`. */
  guardarCatalogos(parcial: Partial<CatalogosAtencion>): Observable<CatalogosAtencion> {
    return this.put<Partial<CatalogosAtencion>>(`${this.base}/catalogos`, parcial).pipe(
      map((res) => ({
        motivosCierre: res?.motivosCierre || [],
        cierreAutoHoras: Number(res?.cierreAutoHoras) || 0,
        etiquetas: res?.etiquetas || [],
        rapidos: res?.rapidos || [],
      })),
    );
  }

  /** Cierra el chat con un motivo del catálogo. */
  cerrar(threadId: string, motivo: string): Observable<AccionHilo> {
    return this.post<AccionHilo>(`${this.ruta(threadId)}/cerrar`, { motivo }).pipe(map((r) => this.normalizar(r)));
  }

  /** Abre de nuevo un chat cerrado (no lo asigna a nadie). */
  reabrir(threadId: string): Observable<AccionHilo> {
    return this.post<AccionHilo>(`${this.ruta(threadId)}/reabrir`, {}).pipe(map((r) => this.normalizar(r)));
  }

  /** Reemplaza las etiquetas del chat (ids del catálogo, máximo 5). */
  etiquetar(threadId: string, etiquetas: string[]): Observable<AccionHilo> {
    return this.put<AccionHilo>(`${this.ruta(threadId)}/etiquetas`, { etiquetas }).pipe(map((r) => this.normalizar(r)));
  }

  agregarNota(threadId: string, texto: string, menciones: string[] = []): Observable<NotaChat> {
    return this.post<{ nota: NotaChat }>(`${this.ruta(threadId)}/notas`, { texto, menciones }).pipe(
      map((res) => res.nota),
    );
  }

  /**
   * Ayuda de Opttia (D-730): resumen del chat o respuesta sugerida. Solo lectura del chat; no envía ni guarda.
   * Sin loader global (la pantalla muestra «Opttia está pensando»). Errores: 422, 403, 429 `CUPO_AGOTADO`,
   * 503 `OPTTIA_NO_DISPONIBLE`; el mensaje viene en `error.message`.
   */
  ayuda(threadId: string, tipo: TipoAyudaOpttia): Observable<AyudaOpttia> {
    return this.postSinLoader<AyudaOpttia>(`${this.ruta(threadId)}/ayuda`, { tipo });
  }

  private normalizar(r: Partial<AccionHilo> | null): AccionHilo {
    return {
      owner: r?.owner || null,
      ...(r?.colaId ? { colaId: r.colaId } : {}),
      cierre: r?.cierre || null,
      etiquetas: Array.isArray(r?.etiquetas) ? (r?.etiquetas as string[]) : [],
    };
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
