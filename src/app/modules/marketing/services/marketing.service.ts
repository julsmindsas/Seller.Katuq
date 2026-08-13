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
  /** [fase 2] Título y descripción EN ESPAÑOL para gente no técnica. */
  titulo?: string;
  descripcion?: string;
  /** true = el título es el de emergencia (nombre limpiado), no uno humano guardado. */
  tituloEsSugerido?: boolean;
  /** [fase 2] Estado en lenguaje humano ("Aprobada", "En revisión de Meta"...). */
  estadoHumano?: string;
  motivoRechazo?: string | null;
  /**
   * [fase 2] Para qué es: "sistema" = notificaciones automáticas de Katuq
   * (pedido creado, despachado...) que NO se ofrecen como mensaje manual;
   * "marketing" = disponibles para campañas y conversación.
   */
  uso?: 'sistema' | 'marketing';
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

  /** Plantillas HSM del WABA del comercio (con `all` también las PENDING/REJECTED). */
  getKapsoTemplates(all = false): Observable<{ items: KapsoTemplate[] }> {
    return this.get<{ items: KapsoTemplate[] }>(
      `/v1/whatsapp/kapso-templates${all ? '?all=1' : ''}`,
    );
  }

  /**
   * [fase 2] Constructor de plantillas: el comercio escribe título y texto
   * (con `{nombre}` como única variable) y el backend la crea en Kapso/Meta
   * para aprobación. El título queda guardado como nombre humano.
   */
  crearPlantilla(payload: {
    titulo: string;
    cuerpo: string;
    descripcion?: string;
  }): Observable<{ success: boolean; name: string; status: string; estadoHumano: string; message?: string }> {
    return this.post<any>('/v1/whatsapp/kapso-templates/crear', payload);
  }

  /**
   * [fase 2] Pide a KAI títulos y descripciones en español para las
   * plantillas que aún no tienen uno humano. El backend los persiste;
   * la respuesta trae { titulos: { <name>: {titulo, descripcion} } }.
   */
  sugerirTitulosPlantillas(
    plantillas: Array<{ name: string; bodyText: string }>,
  ): Observable<{ titulos: Record<string, { titulo: string; descripcion: string }>; generadosPorKai: boolean }> {
    return this.post<any>('/v1/whatsapp/kapso-templates/sugerir-titulos', { plantillas });
  }

  /** Saldo prepago WhatsApp del comercio. */
  getWhatsappBalance(): Observable<WhatsappBalance> {
    return this.get<WhatsappBalance>('/v1/whatsapp/balance');
  }

  /**
   * Envía una plantilla a UN destinatario (Kapso envía + backend debita saldo
   * y persiste usage). Legado del envío secuencial pre-D-097: las campañas ya
   * NO lo iteran (van por launchBroadcast). Se conserva porque el endpoint
   * sigue vivo (lo usa el inbox para iniciar conversación fuera de ventana).
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

  /**
   * [D-097 fase 3] Lanza la campaña vía Kapso Broadcasts: envío server-side
   * (sobrevive al navegador), variables por destinatario y programación.
   */
  launchBroadcast(payload: {
    name: string;
    templateId: string;
    templateName: string;
    recipients: Array<{ phone: string; variables: string[] }>;
    scheduledAt?: string;
    campaignId?: string;
  }): Observable<BroadcastLaunchResult> {
    return this.post<BroadcastLaunchResult>('/v1/whatsapp/campaigns/broadcast', payload);
  }

  /** Progreso de un broadcast en Kapso. */
  getBroadcastStatus(id: string): Observable<BroadcastStatus> {
    return this.get<BroadcastStatus>(`/v1/whatsapp/campaigns/broadcast/${encodeURIComponent(id)}`);
  }
}

/** Respuesta de POST /v1/whatsapp/campaigns/broadcast. */
export interface BroadcastLaunchResult {
  success: boolean;
  broadcastId: string;
  status: string;
  scheduledAt: string | null;
  destinatarios: number;
  duplicados: number;
  erroresKapso: string[];
  costoCOP: number;
  balanceAfter?: number;
  campaignId: string;
  message?: string;
}

/** Respuesta de GET /v1/whatsapp/campaigns/broadcast/:id. */
export interface BroadcastStatus {
  broadcastId: string;
  status: string; // draft|scheduled|sending|stopped|completed|failed
  totalRecipients: number;
  sentCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}
