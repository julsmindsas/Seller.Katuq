import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import { ProveedorContableId, ResolucionServidor, TipoDocumentoFactura } from './facturacion-automatica.util';

/**
 * D-500 (ticket 1260, FE-01): la facturación electrónica en Integraciones.
 * Rutas `/v1/accounting/invoicing/*` del backend; todas responden 403 `FEATURE_DISABLED`
 * sin la bandera `invoicingHub`, así que solo se llaman con ella encendida.
 * La empresa la pone el interceptor y el servidor la toma del JWT.
 */

export type EstadoFacturacion = 'unconfigured' | 'error' | 'testing' | 'connected';

export interface MotivoFacturacion {
  code: string;
  message: string;
}

export interface BloqueoCambio {
  code: string;
  message: string;
  provider?: string | null;
  orderId?: string;
  nroPedido?: string | null;
  requestId?: string;
  since?: string | null;
}

export interface ProveedorDelResumen {
  id: ProveedorContableId;
  name: string;
  configured: boolean;
  selectable: boolean;
  testing: boolean;
  documentTypes: string[];
  lastCheck: { checkedAt: string | null; ok: boolean; code: string | null } | null;
}

export interface EleccionFacturacion {
  defaultProvider: ProveedorContableId;
  byDocumentType: Partial<Record<TipoDocumentoFactura, ProveedorContableId>>;
  previousDefaultProvider: ProveedorContableId | null;
}

export interface ResumenFacturacion {
  success: boolean;
  provider: ProveedorContableId | null;
  providerName: string | null;
  source: 'choice' | 'legacyOrder' | 'none';
  status: EstadoFacturacion;
  reasons: MotivoFacturacion[];
  emailReady: boolean | null;
  certificateExpiresAt: string | null;
  dian: { prefix: string | null; nextNumber: number | null; resolutionNumber: string | null; validTo: string | null } | null;
  choice: EleccionFacturacion | null;
  version: number;
  providers: ProveedorDelResumen[];
  comingSoon: { id: string; name: string }[];
  canConfigure: boolean;
  canSwitch: boolean;
  switchBlockedReason: BloqueoCambio | null;
}

export interface CambioHistorial {
  action: string | null;
  userId: string | null;
  timestamp: string | null;
  fields: string[];
  secretsChanged: string[];
}

@Injectable({ providedIn: 'root' })
export class FacturacionIntegracionService extends BaseService {
  private readonly base = '/v1/accounting/invoicing';

  constructor(http: HttpClient) {
    super(http);
  }

  resumen(): Observable<ResumenFacturacion> {
    return this.get<ResumenFacturacion>(`${this.base}/summary`);
  }

  resolver(documentType: TipoDocumentoFactura): Observable<ResolucionServidor> {
    return this.get<ResolucionServidor>(`${this.base}/resolve?documentType=${encodeURIComponent(documentType)}`);
  }

  elegir(eleccion: { defaultProvider: ProveedorContableId; byDocumentType?: Partial<Record<TipoDocumentoFactura, ProveedorContableId>>; version: number }): Observable<{ success: boolean; version: number; choice: EleccionFacturacion }> {
    return this.put(`${this.base}/choice`, eleccion);
  }

  probarConexion(provider: ProveedorContableId): Observable<{ success: boolean; provider: string; ok: boolean; code: string; message: string }> {
    return this.post(`${this.base}/check`, { provider });
  }

  historial(provider: ProveedorContableId | 'invoicing'): Observable<{ success: boolean; items: CambioHistorial[] }> {
    return this.get(`${this.base}/history?provider=${encodeURIComponent(provider)}`);
  }
}
