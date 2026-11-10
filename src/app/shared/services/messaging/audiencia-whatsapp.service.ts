import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { CrmService } from '../../../components/crm/services/crm.service';
import { CrmLead, CrmStage } from '../../../components/crm/models/crm.models';
import { BaseService } from '../base.service';
import { DestinatarioSegmento } from './whatsapp-consola.models';

/**
 * Celular o fijo a solo dígitos con indicativo. Vacío si no parece un teléfono. Un celular colombiano
 * de 10 dígitos sin indicativo lleva el 57 (mismo criterio del buzón y del asistente de campañas de
 * Marketing).
 */
export function normalizarTelefonoWhatsapp(raw?: string | null): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  return digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
}

/**
 * Las dos fuentes de clientes que ya usa el asistente de campañas de Marketing (D-091): los clientes
 * registrados (`/v1/clients/all`) y los leads del CRM (con etapa opcional). Devuelve la lista con el
 * mismo formato de destinatario; no existe otro concepto de «segmento» guardado en el servidor.
 * Los que no tienen teléfono válido se cuentan aparte para decirlo.
 */
@Injectable({ providedIn: 'root' })
export class AudienciaWhatsappService extends BaseService {
  constructor(http: HttpClient, private readonly crm: CrmService) {
    super(http);
  }

  clientes(): Observable<{ destinatarios: DestinatarioSegmento[]; sinTelefono: number }> {
    return this.get<any[]>('/v1/clients/all').pipe(
      map((data) => {
        const filas = Array.isArray(data) ? data : [];
        const todos = filas.map((c) => ({
          leadId: String(c.cd || c.id || c.documento || ''),
          nombre:
            [c.nombres_completos, c.apellidos_completos].filter(Boolean).join(' ').trim() || c.nombre || '',
          phone: normalizarTelefonoWhatsapp(c.numero_celular_whatsapp || c.numero_celular_comprador || c.telefono || c.celular),
        }));
        return { destinatarios: todos.filter((d) => !!d.phone), sinTelefono: todos.filter((d) => !d.phone).length };
      }),
    );
  }

  etapasCrm(): Observable<CrmStage[]> {
    return this.crm.getStages().pipe(
      map((r) => (r?.stages || []).filter((s) => s.active !== false)),
      catchError(() => of([] as CrmStage[])),
    );
  }

  leadsCrm(etapa?: string): Observable<{ destinatarios: DestinatarioSegmento[]; sinTelefono: number }> {
    const filtros: Record<string, any> = { limit: 500 };
    if (etapa) filtros['stage'] = etapa;
    return this.crm.getLeads(filtros).pipe(
      map((r) => {
        const data: CrmLead[] = r?.data || [];
        const todos = data.map((l) => ({ leadId: l.id, nombre: l.name || '', phone: normalizarTelefonoWhatsapp(l.phone) }));
        return { destinatarios: todos.filter((d) => !!d.phone), sinTelefono: todos.filter((d) => !d.phone).length };
      }),
    );
  }
}
