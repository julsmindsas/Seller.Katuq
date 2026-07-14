import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';
import { ThreadsPage } from '../../../components/notificaciones/whatsapp-inbox/models/whatsapp-thread.model';

/** Plantilla HSM aprobada del WABA del comercio (shape de /v1/whatsapp/kapso-templates). */
export interface KapsoTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
  variables: number[];
}

/** Respuesta de GET /v1/whatsapp/balance (prepago por comercio). */
export interface WhatsappBalance {
  balanceCOP: number;
  priceCOP: number;
  messagesMonth: number;
  costMonthCOP: number;
  accountStatus: string;
}

/** Respuesta de POST /v1/whatsapp/start-conversation. */
export interface StartConversationResult {
  balanceAfter?: number;
  kapsoMessageId?: string;
  message?: string;
  error?: string;
}

/** Resumen de campaña (GET /v1/whatsapp/campaigns — agregado desde usage, D-096). */
export interface CampaignSummary {
  campaignId: string;
  campaignName: string;
  templateName: string | null;
  enviados: number;
  destinatarios: number;
  costoCOP: number;
  mocks: number;
  firstAt: string | null;
  lastAt: string | null;
  convertidos: number;
  /** % de destinatarios con pedido en los 30 días post-envío. */
  tasaConversion: number;
  ventasAtribuidasCOP: number;
}

/**
 * Marketing Service — dashboard + campañas WhatsApp (spec 022).
 *
 * Extiende BaseService para que el interceptor agregue los headers de
 * auth/tenant (regla CLAUDE.md) — a diferencia del inbox, aquí NO se usa
 * fetch directo con URLs hardcodeadas. El envío de campaña reusa el
 * endpoint unitario `start-conversation` (Kapso + débito de saldo
 * server-side, $priceCOP/msg) iterándolo por destinatario.
 */
@Injectable()
export class MarketingService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Actividad del canal WhatsApp (hilos recientes + total). */
  getWhatsappActivity(): Observable<ThreadsPage> {
    return this.get<ThreadsPage>('/v1/whatsapp/conversations');
  }

  /**
   * Clientes registrados del comercio — fuente principal de audiencia para
   * campañas (los leads CRM suelen venir sin teléfono). Mismo endpoint que el
   * módulo Clientes (`maestro.service`).
   */
  getClients(): Observable<any[]> {
    return this.get<any[]>('/v1/clients/all');
  }

  /** Plantillas HSM APPROVED del WABA del comercio. */
  getKapsoTemplates(): Observable<{ items: KapsoTemplate[] }> {
    return this.get<{ items: KapsoTemplate[] }>('/v1/whatsapp/kapso-templates');
  }

  /** Saldo prepago WhatsApp del comercio. */
  getWhatsappBalance(): Observable<WhatsappBalance> {
    return this.get<WhatsappBalance>('/v1/whatsapp/balance');
  }

  /**
   * Envía una plantilla a UN destinatario (Kapso envía + backend debita saldo
   * y persiste usage). La campaña itera este método secuencialmente.
   */
  startConversation(
    phone: string,
    templateName: string,
    languageCode: string,
    variables: string[],
    campaignId?: string,
    campaignName?: string,
  ): Observable<StartConversationResult> {
    return this.post<StartConversationResult>('/v1/whatsapp/start-conversation', {
      phone,
      templateName,
      languageCode,
      variables,
      ...(campaignId ? { campaignId, campaignName } : {}),
    });
  }

  /** Historial de campañas con tasa de conversión (D-096). */
  getCampaigns(): Observable<{ items: CampaignSummary[]; totalCount: number }> {
    return this.get<{ items: CampaignSummary[]; totalCount: number }>('/v1/whatsapp/campaigns');
  }
}
