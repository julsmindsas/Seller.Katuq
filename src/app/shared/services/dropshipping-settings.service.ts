import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { BaseService } from './base.service';
import { SecurityService } from './security/security.service';

/** Reglas del módulo dropshipping de la empresa, como las guarda el servidor (D-403). */
export interface DropshippingReglas {
  margenMinimoPermitido: number;
  tiempoLimiteOrden: number;
  automatizacionActivada: boolean;
  notificacionesActivadas: boolean;
  proveedoresPermitidos: string[];
}

export interface DropshippingAjustes {
  habilitado: boolean;
  fechaActivacion: string | null;
  configuracion: DropshippingReglas;
  /** `false` si la empresa nunca ha guardado configuración en el servidor. */
  configurado: boolean;
  updatedAt?: string | null;
}

export interface DropshippingAjustesEntrada {
  habilitado: boolean;
  configuracion: Partial<DropshippingReglas>;
}

interface Respuesta {
  success: boolean;
  data: DropshippingAjustes;
}

/**
 * ¿Está prendido dropshipping para la empresa de la sesión? Lee el campo `dropshipping`
 * de `currentCompany` (la empresa completa del login). Solo se le cree si esa empresa es
 * la de la sesión: así una empresa anterior no le presta su configuración a otra.
 */
export function dropshippingHabilitadoEnLaSesion(): boolean {
  try {
    const empresa = JSON.parse(localStorage.getItem('currentCompany') || '{}');
    const sesion = JSON.parse(localStorage.getItem('user') || '{}');
    const normalizar = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
    if (!normalizar(sesion?.company) || normalizar(sesion.company) !== normalizar(empresa?.nomComercial)) {
      return false;
    }
    return empresa?.dropshipping?.habilitado === true;
  } catch {
    return false;
  }
}

/**
 * Configuración de dropshipping de la empresa en el servidor
 * (`/v1/companies/dropshipping-settings`). Antes vivía solo en el localStorage del
 * navegador; el servidor manda y la empresa guardada en la sesión se actualiza al guardar.
 */
@Injectable({ providedIn: 'root' })
export class DropshippingSettingsService extends BaseService {
  constructor(http: HttpClient, private readonly securityService: SecurityService) {
    super(http);
  }

  obtener(): Observable<DropshippingAjustes> {
    return this.get<Respuesta>('/v1/companies/dropshipping-settings').pipe(
      map((r) => r.data),
      tap((ajustes) => this.reflejarEnLaSesion(ajustes)),
    );
  }

  guardar(entrada: DropshippingAjustesEntrada): Observable<DropshippingAjustes> {
    return this.post<Respuesta>('/v1/companies/dropshipping-settings', entrada).pipe(
      map((r) => r.data),
      tap((ajustes) => this.reflejarEnLaSesion(ajustes)),
    );
  }

  /** Copia lo que dijo el servidor en `currentCompany` y avisa del cambio (menú, productos). */
  private reflejarEnLaSesion(ajustes: DropshippingAjustes): void {
    try {
      const empresa = JSON.parse(localStorage.getItem('currentCompany') || 'null');
      if (!empresa || typeof empresa !== 'object') return;
      const { habilitado, fechaActivacion, configuracion } = ajustes;
      const anterior = JSON.stringify(empresa.dropshipping ?? null);
      const nuevo = { habilitado, fechaActivacion, configuracion };
      if (anterior === JSON.stringify(nuevo)) return;
      this.securityService.setCompanyInformationLogged({ ...empresa, dropshipping: nuevo });
    } catch {
      // Sin almacenamiento: la pantalla sigue con lo que respondió el servidor.
    }
  }
}
