import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../../shared/services/base.service';

/** Respuesta estándar del backend. */
export interface RespuestaPauta<T> {
  success: boolean;
  error?: string;
  data: T;
}

/**
 * Una fila del embudo (D-485): una campaña, un anuncio o el total. Los costos
 * son null cuando no hay gasto o no hay a quién dividirlo.
 */
export interface FilaEmbudo {
  clave: string;
  nombre: string;
  registros: number;
  producto: number;
  tienda: number;
  primerPedido: number;
  pago: number;
  gastoCOP: number | null;
  ingresoCOP: number;
  costoPorRegistro: number | null;
  costoPorPrimerPedido: number | null;
  costoPorPago: number | null;
}

export interface CampanaEmbudo extends FilaEmbudo {
  anuncios: FilaEmbudo[];
}

export interface GastoEmbudo {
  disponible: boolean;
  motivo: string | null;
  moneda: string | null;
  advertencias: string[];
}

export interface EmbudoPauta {
  desde: string;
  hasta: string;
  gasto: GastoEmbudo;
  total: FilaEmbudo;
  campanas: CampanaEmbudo[];
}

export interface EstadoPauta {
  modos: { eventos: string; avisosPlan: string; crm: string };
  meta: { gastoConfigurado: boolean; eventosConfigurado: boolean; advertencias: string[] };
  resumen: { destinatarios: number };
}

/**
 * Embudo de la pauta hasta el pago (D-485), solo para el equipo de Katuq: el
 * servidor vuelve a validar que la sesión sea de Julsmind.
 */
@Injectable()
export class PautaService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Fechas `YYYY-MM-DD` por fecha de registro de las empresas. */
  embudo(desde: string, hasta: string): Observable<RespuestaPauta<EmbudoPauta>> {
    const q = `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    return this.get<RespuestaPauta<EmbudoPauta>>(`/v1/pauta/embudo?${q}`);
  }

  estado(): Observable<RespuestaPauta<EstadoPauta>> {
    return this.get<RespuestaPauta<EstadoPauta>>('/v1/pauta/estado');
  }
}
