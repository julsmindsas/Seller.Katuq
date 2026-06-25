import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
   * Obtiene la configuración actual del comercio.
   * Si no existe documento, el backend devuelve los defaults.
   */
  getConfig(): Observable<WhatsappIntegrationConfigResponse> {
    return this.get<WhatsappIntegrationConfigResponse>(this.basePath);
  }

  /**
   * Persiste la configuración completa.
   * El backend valida shape + sanitiza credenciales sensibles.
   */
  updateConfig(
    payload: Partial<WhatsappIntegrationConfig>
  ): Observable<WhatsappIntegrationConfigResponse> {
    return this.put<WhatsappIntegrationConfigResponse>(this.basePath, payload);
  }

  /**
   * Registra la aceptación de los Términos y Condiciones (opt-in).
   * El backend setea `optIn.accepted=true`, `acceptedAt`, `acceptedBy`.
   */
  acceptOptIn(): Observable<WhatsappIntegrationConfigResponse> {
    return this.post<WhatsappIntegrationConfigResponse>(
      `${this.basePath}/accept-opt-in`,
      {}
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
