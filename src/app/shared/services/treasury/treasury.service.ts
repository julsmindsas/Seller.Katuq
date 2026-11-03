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
  AlertGroupsResponse,
  OrdersTotals,
  ReviewAction,
  ReviewQueueFilters,
  ReviewQueueResponse,
  PaymentAuditResponse,
  VistaPreviaPagoGrupo,
  PagoGrupoPayload,
  RegistroPagoGrupoResponse,
  RevisionPagoGrupoResponse,
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
  reviewPayment(paymentId: string, action: ReviewAction, motivo: string = '', motivoCodigo: string = ''): Observable<ReviewPaymentResponse> {
    // Ticket 1455: `motivoCodigo` (motivo de la lista) solo viaja cuando la empresa tiene la bandera `motivoRechazoPago`.
    return this.post<ReviewPaymentResponse>(`${this.base}/payments/${paymentId}/review`, motivoCodigo ? { action, motivo, motivoCodigo } : { action, motivo });
  }

  /** GET /payments/:id/audit — ticket 1455: línea de tiempo de un pago (quién lo subió, lo decidió y qué cambió después). */
  getPaymentAudit(paymentId: string, page = 1): Observable<PaymentAuditResponse> {
    return this.get<PaymentAuditResponse>(`${this.base}/payments/${encodeURIComponent(paymentId)}/audit?page=${page}`);
  }

  /** GET /orders/:orderId/payments-audit — ticket 1455: línea de tiempo de todos los pagos de un pedido. */
  getOrderPaymentsAudit(orderId: string, page = 1): Observable<PaymentAuditResponse> {
    return this.get<PaymentAuditResponse>(`${this.base}/orders/${encodeURIComponent(orderId)}/payments-audit?page=${page}`);
  }

  /** POST /payments/:id/annul — ticket 1361: deshace un pago Aprobado (motivo obligatorio). */
  annulPayment(paymentId: string, motivo: string): Observable<{ success: boolean; estadoPago: string; valorRestante: number }> {
    return this.post<{ success: boolean; estadoPago: string; valorRestante: number }>(`${this.base}/payments/${paymentId}/annul`, { motivo });
  }

  /** POST /payments/direct — pago del tesorero desde cero, aprobado directo. */
  directPayment(payload: SubmitPaymentPayload): Observable<SubmitPaymentResponse> {
    return this.post<SubmitPaymentResponse>(`${this.base}/payments/direct`, payload);
  }

  /** POST /orders/:orderId/payment-state — cambio manual validando la matriz de transiciones. */
  changePaymentState(
    orderId: string,
    nuevoEstado: string,
    motivo: string,
    mercanciaVolvioABodega = false,
    cupoCredito?: number,
  ): Observable<ChangePaymentStateResponse> {
    // D-493: mercanciaVolvioABodega = "el producto volvió a la bodega" (pedido ya despachado).
    // Ticket 1448: `cupoCredito` solo viaja al marcar Crédito; el servidor lo guarda en la ficha si el cliente no tiene cupo.
    return this.post<ChangePaymentStateResponse>(`${this.base}/orders/${orderId}/payment-state`, {
      nuevoEstado,
      motivo,
      mercanciaVolvioABodega,
      ...(cupoCredito !== undefined ? { cupoCredito } : {}),
    });
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

  /** GET /payments/queue — cola "Por revisar": todo comprobante pendiente (ticket 1126). */
  getReviewQueue(filtros: ReviewQueueFilters = {}): Observable<ReviewQueueResponse> {
    const qs = this.buildQuery(filtros);
    return this.get<ReviewQueueResponse>(`${this.base}/payments/queue${qs ? '?' + qs : ''}`);
  }

  /** GET /alerts — lista de alertas (opcionalmente filtrada por resolved). */
  getAlerts(resolved?: boolean): Observable<AlertsResponse> {
    const qs = resolved === undefined ? '' : `?resolved=${resolved}`;
    return this.get<AlertsResponse>(`${this.base}/alerts${qs}`);
  }

  /** Alertas agrupadas por referencia, con números de pedido (ticket 1451). */
  getAlertGroups(resolved: boolean | undefined, page = 1, pageSize = 15): Observable<AlertGroupsResponse> {
    const qs = this.buildQuery({ agrupar: true, resolved, page, pageSize });
    return this.get<AlertGroupsResponse>(`${this.base}/alerts?${qs}`);
  }

  /** Resuelve de una vez las alertas de un grupo (máx. 500 por llamada). */
  resolveAlerts(alertIds: string[]): Observable<{ success: boolean; resueltas: number }> {
    return this.post<{ success: boolean; resueltas: number }>(`${this.base}/alerts/resolve-many`, { alertIds });
  }

  /** Totales (pedidos, anticipos, falta por pagar) de todo el resultado filtrado (ticket 1454). */
  getOrdersTotals(filtros: {
    estadosPago: string[];
    fechaInicial?: string;
    fechaFinal?: string;
    nroPedido?: string;
    cliente?: string;
    formaPago?: string;
    /** Ticket 1461 (tarea 3.1): sin los pedidos de clientes internos (el servidor exige la bandera `carteraInterna`). */
    excluirInternos?: boolean;
  }): Observable<OrdersTotals> {
    const qs = this.buildQuery({ ...filtros, estadosPago: filtros.estadosPago.join(',') });
    return this.get<OrdersTotals>(`${this.base}/orders/totals?${qs}`);
  }

  /** POST /payments/group/preview — ticket 1453: pedidos abiertos del cliente con su saldo y el reparto sugerido (solo lee). */
  previewGroupPayment(documento: string, valor = 0): Observable<VistaPreviaPagoGrupo> {
    return this.post<VistaPreviaPagoGrupo>(`${this.base}/payments/group/preview`, { documento, valor });
  }

  /** POST /payments/group — ticket 1453: UN pago repartido entre varios pedidos del mismo cliente (queda en revisión). */
  registerGroupPayment(payload: PagoGrupoPayload): Observable<RegistroPagoGrupoResponse> {
    return this.post<RegistroPagoGrupoResponse>(`${this.base}/payments/group`, payload);
  }

  /** POST /payments/group/:grupoPagoId/review — ticket 1453: aprueba o rechaza todo el pago de grupo en un paso. */
  reviewGroupPayment(grupoPagoId: string, action: ReviewAction, motivo = '', motivoCodigo = ''): Observable<RevisionPagoGrupoResponse> {
    return this.post<RevisionPagoGrupoResponse>(
      `${this.base}/payments/group/${encodeURIComponent(grupoPagoId)}/review`,
      motivoCodigo ? { action, motivo, motivoCodigo } : { action, motivo },
    );
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
