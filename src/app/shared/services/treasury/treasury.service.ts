import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { BaseService } from '../base.service';
import {
  TreasuryConfig,
  TreasuryMetrics,
  SubmitPaymentPayload,
  SubmitPaymentResponse,
  ReviewPaymentResponse,
  ChangePaymentStateResponse,
  PaymentsHistoryResponse,
  PaymentsHistoryFilters,
  AlertsResponse,
  ReviewAction,
} from './treasury.models';

/**
 * Spec 013 — Tesorería MVP.
 * Cliente HTTP del módulo de tesorería. Extiende BaseService para que el
 * interceptor adjunte auth + header `company` (multi-tenant) en cada request.
 * Vive en shared/services para que otros módulos (ventas, POS) lo reusen.
 */
@Injectable({ providedIn: 'root' })
export class TreasuryService extends BaseService {
  private readonly base = '/v1/treasury';

  /** Cache de GET /config: una sola consulta por sesión (compartida entre módulos). */
  private config$: Observable<TreasuryConfig> | null = null;
  private cachedEnabled: boolean | null = null;

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * GET /config → { treasuryEnabled }. Ausente = false (lo resuelve el server).
   * El resultado se cachea en el servicio (shareReplay) para no repetir el GET
   * desde cada componente; en error NO se cachea y la próxima llamada reintenta.
   */
  getConfig(): Observable<TreasuryConfig> {
    if (!this.config$) {
      this.config$ = this.get<TreasuryConfig>(`${this.base}/config`).pipe(
        tap((cfg) => (this.cachedEnabled = cfg?.treasuryEnabled === true)),
        catchError((err) => {
          this.config$ = null;
          return throwError(() => err);
        }),
        shareReplay(1),
      );
    }
    return this.config$;
  }

  /**
   * Valor sincrónico del flag ya cacheado: true/false si /config respondió,
   * null si aún no cargó. Los consumidores deben tratar null como legacy
   * (comportamiento actual) de forma conservadora.
   */
  get treasuryEnabledCached(): boolean | null {
    return this.cachedEnabled;
  }

  /** POST /payments/submit — registro de pago del vendedor (queda en revisión con flag ON). */
  submitPayment(payload: SubmitPaymentPayload): Observable<SubmitPaymentResponse> {
    return this.post<SubmitPaymentResponse>(`${this.base}/payments/submit`, payload);
  }

  /** POST /payments/:id/review — decisión del tesorero (idempotente en el server). */
  reviewPayment(paymentId: string, action: ReviewAction, motivo: string = ''): Observable<ReviewPaymentResponse> {
    return this.post<ReviewPaymentResponse>(`${this.base}/payments/${paymentId}/review`, { action, motivo });
  }

  /** POST /payments/direct — pago del tesorero desde cero, aprobado directo. */
  directPayment(payload: SubmitPaymentPayload): Observable<SubmitPaymentResponse> {
    return this.post<SubmitPaymentResponse>(`${this.base}/payments/direct`, payload);
  }

  /** POST /orders/:orderId/payment-state — cambio manual validando la matriz de transiciones. */
  changePaymentState(orderId: string, nuevoEstado: string, motivo: string): Observable<ChangePaymentStateResponse> {
    return this.post<ChangePaymentStateResponse>(`${this.base}/orders/${orderId}/payment-state`, { nuevoEstado, motivo });
  }

  /** GET /metrics — KPIs server-side. */
  getMetrics(): Observable<TreasuryMetrics> {
    return this.get<TreasuryMetrics>(`${this.base}/metrics`);
  }

  /** GET /payments — historial paginado con filtros. */
  getPayments(filtros: PaymentsHistoryFilters = {}): Observable<PaymentsHistoryResponse> {
    const qs = this.buildQuery(filtros);
    return this.get<PaymentsHistoryResponse>(`${this.base}/payments${qs ? '?' + qs : ''}`);
  }

  /** GET /alerts — lista de alertas (opcionalmente filtrada por resolved). */
  getAlerts(resolved?: boolean): Observable<AlertsResponse> {
    const qs = resolved === undefined ? '' : `?resolved=${resolved}`;
    return this.get<AlertsResponse>(`${this.base}/alerts${qs}`);
  }

  /** POST /alerts/:id/resolve — marca la alerta como resuelta. */
  resolveAlert(alertId: string): Observable<{ success: boolean }> {
    return this.post<{ success: boolean }>(`${this.base}/alerts/${alertId}/resolve`, {});
  }

  /** Serializa un objeto plano a query string, omitiendo vacíos/undefined. */
  private buildQuery(obj: Record<string, any>): string {
    return Object.keys(obj)
      .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
      .join('&');
  }
}
