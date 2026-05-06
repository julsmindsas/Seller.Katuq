import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { getProviderConfig } from './provider-registry';

export type IssueCategory = 'missing_osmosis_id' | 'push_error' | 'cancelled_in_cereza';

export interface ProviderIssue {
  category: IssueCategory;
  cd: string;
  nroPedido: string;
  fechaCreacion: string | any;
  estadoProceso?: string;
  estadoPago?: string;
  cliente?: string | null;
  total?: number;
  typeOrder?: string;
  shopifyOrderName?: string;
  osmosisOrderId?: number;
  osmosisStatus?: string;
  osmosisLastNote?: string;
  osmosisLastSync?: string;
  osmosisError?: string;
}

export interface IssuesResponse {
  success: boolean;
  total: number;
  summary: Record<IssueCategory, number>;
  issues: ProviderIssue[];
}

@Injectable()
export class ProviderDashboardService {
  constructor(private http: HttpClient) {}

  /**
   * Obtiene la lista de pedidos con problemas para el provider dado.
   * El path se compone leyendo del registry — cero hardcoding por integración.
   */
  getOrdersWithIssues(provider: string, limit = 200): Observable<IssuesResponse> {
    const cfg = getProviderConfig(provider);
    if (!cfg || !cfg.endpoints.issues) {
      return throwError(() => new Error(`Provider "${provider}" no soporta issues endpoint.`));
    }
    return this.http.get<IssuesResponse>(
      `${environment.urlApi}${cfg.endpointBase}${cfg.endpoints.issues}?limit=${limit}`,
    );
  }

  /**
   * Reenvía un pedido al provider. Idempotente.
   */
  pushOrder(provider: string, katuqOrderId: string): Observable<{ success: boolean; osmosisOrderId?: number; message?: string }> {
    const cfg = getProviderConfig(provider);
    if (!cfg || !cfg.endpoints.pushOrder) {
      return throwError(() => new Error(`Provider "${provider}" no soporta push de orden.`));
    }
    return this.http.post<{ success: boolean; osmosisOrderId?: number; message?: string }>(
      `${environment.urlApi}${cfg.endpointBase}${cfg.endpoints.pushOrder(katuqOrderId)}`,
      {},
    );
  }
}
