import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../shared/services/base.service";
import {
  Cotizacion,
  CotizacionListFilter,
  CotizacionPaginatedResponse,
  CotizacionMetricsResponse,
  CotizacionConfigResponse,
  CotizacionDetailResponse,
} from "./modelo/cotizacion";

/**
 * Servicio de cotizaciones — spec 008 (T-12).
 * Extiende BaseService (NO usa HttpClient directo): el interceptor agrega
 * Authorization + company automáticamente. Endpoints en /v1/cotizaciones/*.
 */
@Injectable({ providedIn: "root" })
export class CotizacionesService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Listado paginado (server-side) con filtros opcionales por estado. */
  list(filter: CotizacionListFilter = {}): Observable<CotizacionPaginatedResponse> {
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    let url = `/v1/cotizaciones/all?page=${page}&limit=${limit}`;
    if (filter.estado) {
      url += `&estado=${encodeURIComponent(filter.estado)}`;
    }
    if (filter.q) {
      url += `&q=${encodeURIComponent(filter.q)}`;
    }
    if (filter.pedido) {
      url += `&pedido=${encodeURIComponent(filter.pedido)}`;
    }
    return this.get<CotizacionPaginatedResponse>(url);
  }

  /** Filtrado avanzado (estado, fechas, cliente, monto). */
  filtrar(body: any): Observable<CotizacionPaginatedResponse> {
    return this.post<CotizacionPaginatedResponse>("/v1/cotizaciones/filter", body);
  }

  getById(id: string): Observable<CotizacionDetailResponse> {
    return this.get<CotizacionDetailResponse>(`/v1/cotizaciones/${id}`);
  }

  getByNumber(numero: string): Observable<CotizacionDetailResponse> {
    return this.get<CotizacionDetailResponse>(`/v1/cotizaciones/number/${encodeURIComponent(numero)}`);
  }

  create(cotizacion: Cotizacion): Observable<CotizacionDetailResponse> {
    return this.post<CotizacionDetailResponse>("/v1/cotizaciones/create", cotizacion);
  }

  edit(cotizacion: Cotizacion): Observable<{ success: boolean; message?: string }> {
    return this.put<{ success: boolean; message?: string }>("/v1/cotizaciones/edit", cotizacion);
  }

  /** Eliminar (no usa `delete` directo para no chocar con BaseService.delete). */
  deleteCotizacion(id: string): Observable<{ success: boolean; message?: string }> {
    return this.delete<{ success: boolean; message?: string }>(`/v1/cotizaciones/delete?id=${encodeURIComponent(id)}`);
  }

  /** KPIs del listado (cotizado mes, pipeline, conversión, borradores). */
  metrics(): Observable<CotizacionMetricsResponse> {
    return this.get<CotizacionMetricsResponse>("/v1/cotizaciones/metrics");
  }

  /** Términos base por empresa (default si no hay config). */
  getConfig(): Observable<CotizacionConfigResponse> {
    return this.get<CotizacionConfigResponse>("/v1/cotizaciones/config");
  }

  updateConfig(terminosBase: string): Observable<{ success: boolean; message?: string }> {
    return this.put<{ success: boolean; message?: string }>("/v1/cotizaciones/config", { terminosBase });
  }

  /**
   * Genera (o devuelve) el token público para compartir la cotización (spec 008.3).
   * Si está en borrador, el backend la pasa a 'enviada'.
   */
  generarShareToken(id: string): Observable<{ success: boolean; data?: { token: string } }> {
    return this.post<{ success: boolean; data?: { token: string } }>(
      `/v1/cotizaciones/${id}/share-token`,
      {}
    );
  }

  /**
   * Convierte una imagen de Firebase Storage a data URL (base64) vía el backend.
   * Necesario para incrustar los banners en el PDF: el navegador no puede leer
   * Storage por CORS, pero el backend sí. Devuelve { dataUrl }.
   */
  imageToBase64(url: string): Observable<{ success: boolean; dataUrl?: string }> {
    return this.get<{ success: boolean; dataUrl?: string }>(
      `/v1/cotizaciones/image-proxy?url=${encodeURIComponent(url)}`
    );
  }

  /**
   * Marca la cotización como convertida y la enlaza al pedido generado (spec 008.2).
   * Se llama desde la venta asistida cuando el pedido se crea de verdad.
   */
  marcarConvertida(id: string, nroPedido?: string): Observable<{ success: boolean; message?: string; data?: any }> {
    return this.post<{ success: boolean; message?: string; data?: any }>(
      `/v1/cotizaciones/${id}/convertida`,
      { nroPedido: nroPedido || null }
    );
  }
}
