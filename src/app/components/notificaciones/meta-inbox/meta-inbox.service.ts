import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { BaseService } from 'src/app/shared/services/base.service';
import {
  MetaCanal,
  MetaConexiones,
  MetaHilo,
  MetaMensaje,
  MetaPerfilContacto,
  MetaVentana,
} from './models/meta-thread.model';

/**
 * Servicio de los buzones de Meta.
 *
 * Extiende BaseService para que el interceptor adjunte auth y `company`
 * (regla del proyecto: nunca HttpClient directo en componentes).
 *
 * Endpoints (backend `routers/meta.js`):
 *   GET    /v1/meta/connections
 *   POST   /v1/meta/connections/:canal
 *   DELETE /v1/meta/connections/:canal
 *   GET    /v1/meta/conversations/:canal
 *   GET    /v1/meta/conversations/:canal/:hash
 *   GET    /v1/meta/conversations/:canal/:hash/perfil
 *   POST   /v1/meta/conversations/:canal/:hash/vincular
 *   DELETE /v1/meta/conversations/:canal/:hash/vincular
 *   POST   /v1/meta/conversations/:canal/:hash/reply
 */
@Injectable({ providedIn: 'root' })
export class MetaInboxService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  // ─── Conexiones ────────────────────────────────────────────────────────

  obtenerConexiones(): Observable<MetaConexiones | null> {
    return this.get<any>('/v1/meta/connections').pipe(
      map((r) => (r && r.data ? (r.data as MetaConexiones) : null)),
      catchError(() => of(null)),
    );
  }

  /** Completa la conexión con el código que devuelve el diálogo de Meta. */
  conectar(
    canal: MetaCanal,
    code: string,
    redirectUri?: string,
  ): Observable<MetaConexiones | null> {
    return this.post<any>(`/v1/meta/connections/${canal}`, {
      code,
      redirectUri,
    }).pipe(
      map((r) => (r && r.data ? (r.data as MetaConexiones) : null)),
      catchError(() => of(null)),
    );
  }

  desconectar(canal: MetaCanal): Observable<MetaConexiones | null> {
    return this.delete<any>(`/v1/meta/connections/${canal}`).pipe(
      map((r) => (r && r.data ? (r.data as MetaConexiones) : null)),
      catchError(() => of(null)),
    );
  }

  // ─── Conversaciones ────────────────────────────────────────────────────

  listarHilos(canal: MetaCanal, dias = 90): Observable<MetaHilo[]> {
    return this.get<any>(`/v1/meta/conversations/${canal}?dias=${dias}`).pipe(
      map((r) => (r && r.data && r.data.items ? (r.data.items as MetaHilo[]) : [])),
      catchError(() => of([])),
    );
  }

  mensajesDeHilo(
    canal: MetaCanal,
    identidadHash: string,
  ): Observable<{ items: MetaMensaje[]; ventana: MetaVentana }> {
    return this.get<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}`,
    ).pipe(
      map((r) =>
        r && r.data
          ? r.data
          : { items: [], ventana: { abierta: false, minutosRestantes: 0, expiraEn: null } },
      ),
      catchError(() =>
        of({
          items: [] as MetaMensaje[],
          ventana: { abierta: false, minutosRestantes: 0, expiraEn: null },
        }),
      ),
    );
  }

  // ─── Panel de contacto y vinculación ───────────────────────────────────

  perfilDeHilo(
    canal: MetaCanal,
    identidadHash: string,
  ): Observable<MetaPerfilContacto | null> {
    return this.get<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/perfil`,
    ).pipe(
      map((r) => (r && r.data ? (r.data as MetaPerfilContacto) : null)),
      catchError(() => of(null)),
    );
  }

  vincularCliente(
    canal: MetaCanal,
    identidadHash: string,
    clienteId: string,
  ): Observable<MetaPerfilContacto | null> {
    return this.post<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/vincular`,
      { clienteId },
    ).pipe(
      map((r) => (r && r.data ? (r.data as MetaPerfilContacto) : null)),
      catchError(() => of(null)),
    );
  }

  desvincularCliente(
    canal: MetaCanal,
    identidadHash: string,
  ): Observable<MetaPerfilContacto | null> {
    return this.delete<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/vincular`,
    ).pipe(
      map((r) => (r && r.data ? (r.data as MetaPerfilContacto) : null)),
      catchError(() => of(null)),
    );
  }

  // ─── Envío ─────────────────────────────────────────────────────────────

  /**
   * Responde un hilo. El backend valida la ventana ANTES de llamar a Meta, así
   * que un `success:false` con motivo `ventana_cerrada` es una respuesta
   * normal, no un error de red.
   */
  responder(
    canal: MetaCanal,
    identidadHash: string,
    texto: string,
  ): Observable<{ enviado: boolean; motivo?: string }> {
    return this.post<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/reply`,
      { texto },
    ).pipe(
      map((r) => ({
        enviado: Boolean(r && r.success),
        motivo: r && r.motivo ? r.motivo : undefined,
      })),
      catchError(() => of({ enviado: false, motivo: 'error_red' })),
    );
  }
}
