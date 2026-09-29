import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

export interface FilaCampana {
  campana: string;
  registros: number;
  respondieron: number;
  vendedoresActivos: number;
  porcentajeActivos: number;
  costoCOP: number | null;
  costoPorRegistro: number | null;
  costoPorVendedorActivo: number | null;
}

/** Registros por campaña de pauta (D-327). Solo el Super Admin. */
@Injectable({ providedIn: 'root' })
export class PautaMetricasService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  metricas(desde: string): Observable<{ success: boolean; data: { desde: string; campanas: FilaCampana[] } }> {
    return this.get(`/v1/registro/metricas-campana?desde=${encodeURIComponent(desde)}`);
  }

  guardarCosto(utmCampaign: string, costoCOP: number): Observable<{ success: boolean }> {
    return this.put('/v1/registro/costo-campana', { utmCampaign, costoCOP });
  }
}
