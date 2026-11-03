import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../shared/services/base.service';
import {
  ArticuloAdmin, ArticuloAyuda, CambiosArticulo, FiltrosAdmin, HallazgoDato, ModuloAyuda, TipoArticulo, VersionArticulo,
} from './centro-ayuda.models';

/** Arma `?a=1&b=2` sin los valores vacíos. */
function consulta(params: Record<string, string | undefined | null>): string {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

/** Un error de dominio del servidor: `code` y, si hay, los datos de clientes encontrados. */
export interface ErrorAyuda {
  status?: number;
  error?: { code?: string; error?: string; hallazgos?: HallazgoDato[] };
}

/**
 * Centro de ayuda, fase 1 (D-628). Lectura del comercio (`/v1/help-center/articles`) y administración
 * de Julsmind (`/v1/help-center/admin/articles`). La empresa y el rol los toma el servidor del JWT.
 */
@Injectable({ providedIn: 'root' })
export class CentroAyudaService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  // ── Comercio ─────────────────────────────────────────────────────────

  articulos(filtros: { q?: string; module?: ModuloAyuda | ''; type?: TipoArticulo | '' } = {}): Observable<{ success: boolean; data: ArticuloAyuda[] }> {
    return this.get(`/v1/help-center/articles${consulta({ q: filtros.q, module: filtros.module, type: filtros.type })}`);
  }

  articulo(id: string): Observable<{ success: boolean; data: ArticuloAyuda }> {
    return this.get(`/v1/help-center/articles/${encodeURIComponent(id)}`);
  }

  // ── Administración (Julsmind) ────────────────────────────────────────

  adminArticulos(filtros: FiltrosAdmin = {}): Observable<{ success: boolean; data: ArticuloAdmin[] }> {
    return this.get(`/v1/help-center/admin/articles${consulta({ status: filtros.status, scope: filtros.scope, q: filtros.q })}`);
  }

  adminArticulo(id: string): Observable<{ success: boolean; data: ArticuloAdmin }> {
    return this.get(`/v1/help-center/admin/articles/${encodeURIComponent(id)}`);
  }

  adminVersiones(id: string): Observable<{ success: boolean; data: VersionArticulo[] }> {
    return this.get(`/v1/help-center/admin/articles/${encodeURIComponent(id)}/versions`);
  }

  adminCrear(datos: CambiosArticulo): Observable<{ success: boolean; data: ArticuloAdmin }> {
    return this.post('/v1/help-center/admin/articles', datos);
  }

  /** Editar un publicado lo devuelve a borrador (`vuelveABorrador`): hay que aprobarlo de nuevo. */
  adminActualizar(id: string, datos: CambiosArticulo): Observable<{ success: boolean; data: ArticuloAdmin; vuelveABorrador: boolean }> {
    return this.put(`/v1/help-center/admin/articles/${encodeURIComponent(id)}`, datos);
  }

  /** 422 DATOS_DE_CLIENTES si un global menciona datos de clientes (con `hallazgos`). */
  adminCambiarEstado(id: string, accion: 'publish' | 'unpublish' | 'archive' | 'restore'): Observable<{ success: boolean; data: ArticuloAdmin }> {
    return this.post(`/v1/help-center/admin/articles/${encodeURIComponent(id)}/${accion}`, {});
  }
}
