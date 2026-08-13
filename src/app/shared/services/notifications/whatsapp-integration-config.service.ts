import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { BaseService } from '../base.service';

/**
 * Tipos de notificación de WhatsApp soportados por el comercio.
 * Mantener alineado con el backend (notification.types).
 */
export type WhatsappNotificationType =
  | 'ORDER_CREATED'
  | 'PAYMENT_APPROVED'
  | 'PRODUCTION_COMPLETED'
  | 'ORDER_DISPATCHED'
  | 'ORDER_DELIVERED'
  | 'ORDER_PROCESS_REJECTED';

/**
 * Credenciales propias del comercio (modo avanzado).
 * Si `enabled = false`, el comercio usa las credenciales globales de Katuq.
 */
export interface WhatsappOwnCredentials {
  enabled: boolean;
  apiKey?: string | null;
  phoneNumberId?: string | null;
  baseUrl?: string | null;
  /** Solo lectura — lo escribe el servidor al "Probar conexión". */
  hasApiKey?: boolean;
  verifiedAt?: string | null;
  numeroVerificado?: string | null;
  nombreVerificado?: string | null;
}

/**
 * Configuración de la integración WhatsApp Business (Kapso) para el comercio.
 */
export interface WhatsappIntegrationConfig {
  /** Toggle global de la integración. */
  enabled: boolean;
  /** Nombre comercial usado en las plantillas. */
  commercialName?: string | null;
  /** Si está activo, usa `commercialName` en vez del nombre de la empresa. */
  commercialNameOverride: boolean;
  /** Aceptación de términos y condiciones (opt-in). */
  optIn: {
    accepted: boolean;
    acceptedAt?: string | null;
    acceptedBy?: string | null;
    version?: string | null;
  };
  /** Tipos de notificación habilitados. */
  enabledNotificationTypes: WhatsappNotificationType[];
  /** Configuración de auto-respuesta a mensajes entrantes. */
  autoRespond: {
    enabled: boolean;
    message?: string | null;
    contact?: string | null;
  };
  /** Credenciales propias Kapso/Meta del comercio. */
  ownCredentials: WhatsappOwnCredentials;
  /** Salud de la conexión (fecha del último mensaje entrante recibido). */
  conexion?: { ultimoInboundAt?: string | null };
}

/**
 * Respuesta tipada del backend para get/update config.
 */
export interface WhatsappIntegrationConfigResponse {
  success: boolean;
  data: WhatsappIntegrationConfig;
  message?: string;
}

/**
 * Configuración del bot de pedidos por WhatsApp (vista pública del backend).
 * `puedeActivarse` lo calcula el servidor: solo con número propio conectado.
 */
export interface WhatsappBotConfig {
  enabled: boolean;
  modoSombra: boolean;
  topeTurnos: number;
  mensajeBienvenida: string;
  anunciarQueEsBot: boolean;
  horarioHabilitado: boolean;
  horarioDesde: string;
  horarioHasta: string;
  horarioDias: number[];
  puedeActivarse: boolean;
}

/**
 * Servicio para administrar la configuración de la integración WhatsApp Business (Kapso).
 * Extiende `BaseService` para que el interceptor adjunte auth + company headers (Art IX).
 *
 * Endpoints (backend Express):
 *   GET  /v1/whatsapp/integration-config
 *   PUT  /v1/whatsapp/integration-config
 *   POST /v1/whatsapp/integration-config/accept-opt-in
 *   POST /v1/whatsapp/integration-config/test
 */
@Injectable({
  providedIn: 'root',
})
export class WhatsappIntegrationConfigService extends BaseService {
  private readonly basePath = '/v1/whatsapp/integration-config';

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * El backend responde el `publicView` PLANO (optInAccepted,
   * templatesEnabled, autoRespondEnabled...), no el shape anidado de esta
   * interfaz ni un envoltorio {success,data}. Acá se traduce SIEMPRE —
   * mismo criterio tolerante que getBotConfig — para que el componente no
   * dependa de cuál forma llegó.
   */
  private normalizarConfig(raw: any): WhatsappIntegrationConfig {
    const cfg = raw?.data || raw?.config || raw || {};
    return {
      enabled: !!cfg.enabled,
      commercialName: cfg.commercialName ?? null,
      commercialNameOverride: !!cfg.commercialNameOverride,
      optIn: cfg.optIn
        ? {
            accepted: !!cfg.optIn.accepted,
            acceptedAt: cfg.optIn.acceptedAt ?? null,
            acceptedBy: cfg.optIn.acceptedBy ?? null,
          }
        : {
            accepted: !!cfg.optInAccepted,
            acceptedAt: cfg.optInAcceptedAt ?? null,
            acceptedBy:
              (cfg.optInAcceptedBy && (cfg.optInAcceptedBy.email || cfg.optInAcceptedBy.userName)) ??
              null,
          },
      enabledNotificationTypes:
        cfg.enabledNotificationTypes || cfg.templatesEnabled || [],
      autoRespond: cfg.autoRespond
        ? {
            enabled: !!cfg.autoRespond.enabled,
            message: cfg.autoRespond.message ?? null,
            contact: cfg.autoRespond.contact ?? null,
          }
        : {
            enabled: !!cfg.autoRespondEnabled,
            message: cfg.autoRespondMessage ?? null,
            contact: cfg.autoRespondContact ?? null,
          },
      ownCredentials: {
        enabled: !!cfg.ownCredentials?.enabled,
        apiKey: cfg.ownCredentials?.apiKey ?? null,
        phoneNumberId: cfg.ownCredentials?.phoneNumberId ?? null,
        baseUrl: cfg.ownCredentials?.baseUrl ?? null,
        hasApiKey: !!cfg.ownCredentials?.hasApiKey,
        verifiedAt: cfg.ownCredentials?.verifiedAt ?? null,
        numeroVerificado: cfg.ownCredentials?.numeroVerificado ?? null,
        nombreVerificado: cfg.ownCredentials?.nombreVerificado ?? null,
      },
      conexion: { ultimoInboundAt: cfg.conexion?.ultimoInboundAt ?? null },
    };
  }

  /**
   * Obtiene la configuración actual del comercio.
   * Si no existe documento, el backend devuelve los defaults.
   */
  getConfig(): Observable<WhatsappIntegrationConfigResponse> {
    return this.get<any>(this.basePath).pipe(
      map((raw: any) => ({ success: true, data: this.normalizarConfig(raw) }))
    );
  }

  /**
   * Persiste la configuración. Traduce el shape del componente al que espera
   * el PUT del backend (templatesEnabled, autoRespond*, etc.).
   */
  updateConfig(
    payload: Partial<WhatsappIntegrationConfig>
  ): Observable<WhatsappIntegrationConfigResponse> {
    const body: any = {};
    if (payload.enabled !== undefined) body.enabled = !!payload.enabled;
    if (payload.commercialName !== undefined) {
      body.commercialName = payload.commercialName || '';
    }
    if (payload.commercialNameOverride !== undefined) {
      body.commercialNameOverride = !!payload.commercialNameOverride;
    }
    if (payload.enabledNotificationTypes !== undefined) {
      body.templatesEnabled = payload.enabledNotificationTypes;
    }
    if (payload.autoRespond !== undefined) {
      body.autoRespondEnabled = !!payload.autoRespond?.enabled;
      body.autoRespondMessage = payload.autoRespond?.message || '';
      body.autoRespondContact = payload.autoRespond?.contact || '';
    }
    if (payload.ownCredentials !== undefined) {
      const oc = payload.ownCredentials || ({} as WhatsappOwnCredentials);
      body.ownCredentials = {
        ...(oc.enabled !== undefined ? { enabled: !!oc.enabled } : {}),
        ...(oc.apiKey ? { apiKey: oc.apiKey } : {}),
        ...(oc.phoneNumberId !== undefined
          ? { phoneNumberId: oc.phoneNumberId || '' }
          : {}),
        ...(oc.baseUrl !== undefined ? { baseUrl: oc.baseUrl || '' } : {}),
      };
    }
    return this.put<any>(this.basePath, body).pipe(
      map((raw: any) => ({ success: true, data: this.normalizarConfig(raw) }))
    );
  }

  /**
   * [fase 2] "Probar conexión": el backend valida las credenciales GUARDADAS
   * contra Kapso y persiste el número/nombre verificados. La API key nunca
   * viaja en esta llamada.
   */
  verifyOwnCredentials(): Observable<{
    success: boolean;
    numero?: string | null;
    nombre?: string | null;
    message?: string;
  }> {
    return this.post<any>('/v1/whatsapp/own-credentials/verify', {});
  }

  /**
   * Registra la aceptación de los Términos y Condiciones (opt-in).
   * El backend setea `optIn.accepted=true`, `acceptedAt`, `acceptedBy`.
   */
  acceptOptIn(): Observable<WhatsappIntegrationConfigResponse> {
    // El backend responde solo el recibo del opt-in — se re-lee la config
    // completa para que el componente reciba el shape de siempre.
    return this.post<any>(`${this.basePath}/accept-opt-in`, {}).pipe(
      switchMap(() => this.getConfig())
    );
  }

  /**
   * Configuración del bot de pedidos. El backend puede responder con o sin
   * envoltura ({success,data} / {success,config} / plano), así que acá se
   * normaliza y el componente recibe siempre el bloque `bot` o `null`.
   */
  getBotConfig(): Observable<WhatsappBotConfig | null> {
    return this.get<any>(this.basePath).pipe(
      map((res: any) => {
        const cfg = res?.data || res?.config || res || {};
        return cfg.bot ? (cfg.bot as WhatsappBotConfig) : null;
      })
    );
  }

  /**
   * Guarda SOLO el bloque del bot (el backend hace merge con lo demás).
   * Si el comercio no tiene número propio, el backend responde 422 con
   * `BOT_REQUIERE_NUMERO_PROPIO` — el componente lo traduce.
   */
  updateBotConfig(
    bot: Partial<WhatsappBotConfig>
  ): Observable<WhatsappBotConfig | null> {
    return this.put<any>(this.basePath, { bot }).pipe(
      map((res: any) => {
        const cfg = res?.data || res?.config || res || {};
        return cfg.bot ? (cfg.bot as WhatsappBotConfig) : null;
      })
    );
  }

  /**
   * Dispara un mensaje de prueba al número de contacto configurado
   * o al usuario logueado si no se especifica `to`.
   */
  sendTest(payload?: {
    to?: string;
    type?: WhatsappNotificationType;
  }): Observable<{ success: boolean; message?: string }> {
    return this.post<{ success: boolean; message?: string }>(
      `${this.basePath}/test`,
      payload || {}
    );
  }
}
