import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SyncLogFilters {
  bodegaId?: string;
  provider?: string;
  syncType?: string;
  fechaInicio?: string;
  fechaFin?: string;
  limit?: number;
}

export interface FulfillmentSyncLog {
  id: string;
  timestamp: Date;
  provider: string;
  syncType: 'producto' | 'bodega_completa' | 'automatico';
  bodegaId?: string;
  bodegaNombre?: string;
  productoId?: string;
  productoNombre?: string;
  sku?: string;
  stockAnterior?: number;
  stockNuevo?: number;
  diferencia?: number;
  resultado: 'success' | 'error' | 'warning';
  mensaje?: string;
  detalles?: any;
}

export interface SyncLogsResponse {
  success: boolean;
  data: {
    logs: FulfillmentSyncLog[];
    total: number;
  };
}

export interface SyncStats {
  totalSincronizaciones: number;
  productosActualizados: number;
  errores: number;
  ultimaSincronizacion?: Date;
  syncsPorDia: { fecha: string; cantidad: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class FulfillmentSyncLogsService {
  private apiUrl = environment.urlApi + '/v1/fulfillment';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los logs de sincronización con filtros opcionales
   */
  getSyncLogs(filters: SyncLogFilters = {}): Observable<SyncLogsResponse> {
    let params = new HttpParams();

    if (filters.bodegaId) {
      params = params.set('bodegaId', filters.bodegaId);
    }
    if (filters.provider) {
      params = params.set('provider', filters.provider);
    }
    if (filters.syncType) {
      params = params.set('syncType', filters.syncType);
    }
    if (filters.fechaInicio) {
      params = params.set('fechaInicio', filters.fechaInicio);
    }
    if (filters.fechaFin) {
      params = params.set('fechaFin', filters.fechaFin);
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<SyncLogsResponse>(`${this.apiUrl}/sync-logs`, { params });
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  getSyncStats(bodegaId?: string): Observable<{ success: boolean; data: SyncStats }> {
    let params = new HttpParams();
    if (bodegaId) {
      params = params.set('bodegaId', bodegaId);
    }
    return this.http.get<{ success: boolean; data: SyncStats }>(`${this.apiUrl}/sync-stats`, { params });
  }

  /**
   * Obtiene el detalle de un log específico
   */
  getSyncLogDetail(logId: string): Observable<{ success: boolean; data: FulfillmentSyncLog }> {
    return this.http.get<{ success: boolean; data: FulfillmentSyncLog }>(`${this.apiUrl}/sync-logs/${logId}`);
  }
}
