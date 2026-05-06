import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
   * Construye headers de autenticación leyendo del localStorage. Necesario
   * porque el HttpInterceptor global a veces no se aplica a módulos lazy
   * sin importar HttpClientModule explícito; agregar headers manualmente
   * garantiza que la request al backend Katuq tenga Authorization, company,
   * user y usage-code.
   */
  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return headers;
      const user = JSON.parse(userStr);
      if (user.token) headers = headers.set('Authorization', 'Bearer ' + user.token);
      if (user.company) headers = headers.set('company', user.company);
      if (user.nit) headers = headers.set('user', user.nit);
      if (user.authorizationCode) headers = headers.set('usage-code', user.authorizationCode);
      if (user.email) headers = headers.set('email', user.email);
    } catch (_) { /* skip */ }
    return headers;
  }

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
      { headers: this.buildHeaders() },
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
      { headers: this.buildHeaders() },
    );
  }
}
