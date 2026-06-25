import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BaseService } from '../base.service';

/**
 * Estado de la cuenta de WhatsApp Business.
 * - `active`: cuenta operativa.
 * - `closing`: cuenta en cierre / saldo bajo crítico.
 * - `closed`: cuenta cerrada.
 */
export type WhatsappAccountStatus = 'active' | 'closing' | 'closed';

export interface WhatsappBalance {
  /** Saldo disponible en COP */
  balanceCOP: number;
  /** Precio por mensaje en COP (default 80) */
  priceCOP: number;
  /** Total histórico recargado en COP */
  totalToppedUpCOP: number;
  /** Total histórico consumido en COP */
  totalConsumedCOP: number;
  /** Mensajes enviados en el mes actual */
  messagesMonth: number;
  /** Costo del mes actual en COP */
  costMonthCOP: number;
  /** Saldo máximo histórico — usado para decidir banner de saldo bajo */
  historicalMaxBalanceCOP?: number;
  /** Estado actual de la cuenta */
  accountStatus: WhatsappAccountStatus;
  /** Si el bonus de bienvenida está disponible para reclamar */
  welcomeBonusAvailable: boolean;
  /** Última actualización del saldo (ISO) */
  updatedAt?: string;
}

export interface WhatsappUsageQuery {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export interface WhatsappUsageItem {
  id: string;
  date: string;
  to: string;
  templateName?: string;
  status: string;
  costCOP: number;
}

export interface WhatsappUsageResponse {
  items: WhatsappUsageItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WhatsappTopupRequest {
  amountCOP: number;
  notes?: string;
}

export interface WhatsappTopupResponse {
  success: boolean;
  newBalanceCOP: number;
  transactionId?: string;
  message?: string;
}

export interface WhatsappWelcomeBonusResponse {
  success: boolean;
  amountCOP: number;
  newBalanceCOP: number;
  message?: string;
}

export interface WhatsappPreferences {
  /** Si los envíos automáticos están activos */
  enabled: boolean;
  /** Umbral en COP para alerta de saldo bajo */
  lowBalanceThresholdCOP?: number;
  /** Email para notificaciones de saldo bajo */
  alertEmail?: string;
  /** Recarga automática activa */
  autoTopupEnabled?: boolean;
  /** Monto de recarga automática en COP */
  autoTopupAmountCOP?: number;
}

export interface WhatsappHealth {
  ok: boolean;
  status: WhatsappAccountStatus;
  lastCheckedAt?: string;
  details?: string;
}

/**
 * Servicio HTTP para el medidor de saldo de WhatsApp Business.
 * Extiende BaseService (Artículo IX: nunca HttpClient directo en componentes).
 * Todos los montos se manejan en COP enteros — el frontend solo formatea.
 */
@Injectable({ providedIn: 'root' })
export class WhatsappBillingService extends BaseService {

  private readonly basePath = '/v1/whatsapp';

  constructor(http: HttpClient) {
    super(http);
  }

  /** Saldo, KPIs del mes y estado de la cuenta. */
  getBalance(): Observable<WhatsappBalance> {
    return this.get<WhatsappBalance>(`${this.basePath}/balance`);
  }

  /** Historial paginado de consumo. */
  getUsage(params: WhatsappUsageQuery = {}): Observable<WhatsappUsageResponse> {
    const query = this.buildQuery(params);
    return this.get<WhatsappUsageResponse>(`${this.basePath}/usage${query}`);
  }

  /** Recarga de saldo en COP. */
  topup(payload: WhatsappTopupRequest): Observable<WhatsappTopupResponse> {
    return this.post<WhatsappTopupResponse>(`${this.basePath}/topup`, payload);
  }

  /** Reclama el bonus de bienvenida (única vez por empresa). */
  requestWelcomeBonus(): Observable<WhatsappWelcomeBonusResponse> {
    return this.post<WhatsappWelcomeBonusResponse>(`${this.basePath}/welcome-bonus`, {});
  }

  /** Preferencias de facturación / alertas. */
  getPreferences(): Observable<WhatsappPreferences> {
    return this.get<WhatsappPreferences>(`${this.basePath}/preferences`);
  }

  /** Actualiza preferencias parciales. */
  updatePreferences(prefs: Partial<WhatsappPreferences>): Observable<WhatsappPreferences> {
    return this.put<WhatsappPreferences>(`${this.basePath}/preferences`, prefs);
  }

  /** Salud del proveedor / estado de la cuenta. */
  getHealth(): Observable<WhatsappHealth> {
    return this.get<WhatsappHealth>(`${this.basePath}/health`);
  }

  private buildQuery(params: Record<string, unknown>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (entries.length === 0) return '';
    const qs = entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `?${qs}`;
  }
}
