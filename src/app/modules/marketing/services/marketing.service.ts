import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';
import { ThreadsPage } from '../../../components/notificaciones/whatsapp-inbox/models/whatsapp-thread.model';

/**
 * Marketing Service — MVP dashboard (spec 022).
 *
 * Solo expone las fuentes que el dashboard NO puede tomar de servicios ya
 * existentes (AnalyticsService y CrmService son providedIn:'root' y se
 * inyectan directo en el componente). Extiende BaseService para que el
 * interceptor agregue los headers de auth/tenant (regla CLAUDE.md).
 */
@Injectable()
export class MarketingService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Actividad del canal WhatsApp (hilos recientes + total).
   * Real: `GET /v1/whatsapp/conversations` (mismo endpoint del inbox 009.5).
   */
  getWhatsappActivity(): Observable<ThreadsPage> {
    return this.get<ThreadsPage>('/v1/whatsapp/conversations');
  }
}
