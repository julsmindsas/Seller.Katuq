import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SubscriptionPlan } from '../../models/planes/plan.model';

@Injectable({ providedIn: 'root' })
export class PlanesService {
  private readonly baseUrl = '/v1/subscription-plans';

  constructor(private http: HttpClient) {}

  getPlanes(parametros?: { activo?: boolean; tipo?: string; orderBy?: string; orderDirection?: 'asc' | 'desc' }): Observable<SubscriptionPlan[]> {
    let params = new HttpParams();
    if (parametros) {
      if (parametros.activo !== undefined) params = params.set('activo', parametros.activo);
      if (parametros.tipo) params = params.set('tipo', parametros.tipo);
      if (parametros.orderBy) params = params.set('orderBy', parametros.orderBy);
      if (parametros.orderDirection) params = params.set('orderDirection', parametros.orderDirection);
    }
    return this.http.get<SubscriptionPlan[]>(`${this.baseUrl}`, { params });
  }

  getPlan(id: string): Observable<SubscriptionPlan> {
    return this.http.get<SubscriptionPlan>(`${this.baseUrl}/${id}`);
  }

  crearPlan(plan: Partial<SubscriptionPlan>): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, plan);
  }

  actualizarPlan(id: string, updates: Partial<SubscriptionPlan>): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, updates);
  }

  cambiarEstado(id: string, activo: boolean): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/status`, { activo });
  }

  eliminarPlan(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }

  obtenerPlanesActivos(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>(`${this.baseUrl}/active`);
  }
} 