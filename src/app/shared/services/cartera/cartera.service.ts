import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { CarteraEvolucionResponse, CarteraResponse } from './cartera.models';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera).
 * Cliente HTTP de cartera. Extiende BaseService para que el interceptor adjunte
 * auth + header `company` (multi-tenant) en cada request. Vive en shared/services
 * para que otros módulos lo reusen. El endpoint reusa el dominio de tesorería.
 */
@Injectable({ providedIn: 'root' })
export class CarteraService extends BaseService {
  private readonly base = '/v1/treasury';

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * GET /cartera — cartera agrupada por cliente + KPIs + aging, todo server-side.
   * Una sola llamada trae todo; los filtros de la pantalla son client-side.
   */
  getCartera(): Observable<CarteraResponse> {
    return this.get<CarteraResponse>(`${this.base}/cartera`);
  }

  /** GET /cartera/evolucion — fotos mensuales de cartera total y vencida (últimos 12 meses, ticket 1464). */
  getEvolucion(): Observable<CarteraEvolucionResponse> {
    return this.get<CarteraEvolucionResponse>(`${this.base}/cartera/evolucion`);
  }
}
