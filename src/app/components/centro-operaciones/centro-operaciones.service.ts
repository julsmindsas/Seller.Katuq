import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../../shared/services/BaseService';

/** Etapas de la cola de despacho, en el orden en que avanza un pedido. */
export const ETAPAS_COLA = ['ProducidoTotalmente', 'Empacado', 'ParaDespachar'] as const;
export type EtapaCola = typeof ETAPAS_COLA[number];

export const NOMBRE_ETAPA: Record<EtapaCola, string> = {
  ProducidoTotalmente: 'Producido',
  Empacado: 'Empacado',
  ParaDespachar: 'Listo para despachar',
};

export interface LineaCola { productoId: string; nombre: string; cantidad: number; }
export interface FaltanteCola { productoId: string; nombre: string; faltan: number; }

export interface PedidoCola {
  id: string;
  nroPedido: string;
  etapa: EtapaCola;
  estadoPago: string;
  entrega: string | null;
  horario: string;
  urgencia: 'hoy' | 'vencido' | 'proximo' | 'sin_fecha';
  diasVencido: number;
  /** Entrega vencida hace más de `resumen.diasRezago` días: no se opera desde la escena. */
  rezagado: boolean;
  bodega: string | null;
  transportador: string | null;
  conOrdenEnvio: boolean;
  cliente: string;
  ciudad: string;
  lineas: LineaCola[];
  /** Algún producto está en negativo en la bodega del pedido (solo cola viva). */
  frenado: boolean;
  faltantes: FaltanteCola[];
}

export interface ProductoCola {
  id: string;
  nombre: string;
  referencia: string;
  inventariable: boolean;
  /** Saldo por bodega, con negativos. null si no lleva inventario. */
  stockPorBodega: Record<string, number> | null;
  stockTotal: number | null;
  /** Unidades pedidas en la cola viva. */
  enCola: number;
  pedidos: number;
}

export interface BodegaCola { id: string | null; nombre: string; pedidos: number; frenados: number; }
export interface TransportadorCola { nombre: string; pedidos: number; }

export interface ResumenCola {
  cola: number;
  vivos: number;
  rezagados: number;
  porEtapa: Partial<Record<EtapaCola, number>>;
  urgentes: number;
  frenados: number;
  sinBodega: number;
  productosEnNegativo: number;
  diasRezago: number;
}

/** Respuesta de GET /v1/analytics/logistica/centro-operaciones (D-354). */
export interface FotoOperacion {
  /** false = la empresa no tiene encendido el centro de operaciones. */
  disponible: boolean;
  calculadoEn?: string;
  truncado?: boolean;
  soloPropias?: boolean;
  pedidos?: PedidoCola[];
  productos?: ProductoCola[];
  bodegas?: BodegaCola[];
  transportadores?: TransportadorCola[];
  resumen?: ResumenCola;
}

/** Foto de la operación: cola de despacho + stock real de sus productos. Solo lectura. */
@Injectable({ providedIn: 'root' })
export class CentroOperacionesService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getFoto(): Observable<FotoOperacion> {
    return this.get<FotoOperacion>('/v1/analytics/logistica/centro-operaciones');
  }
}
