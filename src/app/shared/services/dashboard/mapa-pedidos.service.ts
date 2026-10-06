import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseService } from '../BaseService';

export interface DepartamentoMapa {
  iso: string | null;
  dane: string;
  nombre: string;
  pedidos: number;
  ventas: number;
  /** Pedidos del departamento sin ciudad reconocida. */
  sinCiudad: number;
}

export interface CiudadMapa {
  dane: string;
  nombre: string;
  departamento: string | null;
  iso: string | null;
  pedidos: number;
  ventas: number;
}

/** Respuesta de GET /v1/analytics/logistica/mapa-pedidos (D-352). */
export interface MapaPedidosResponse {
  periodo: { inicio: string; fin: string; dias: number };
  soloPropias: boolean;
  truncado: boolean;
  totalPedidos: number;
  conCiudad: number;
  soloDepartamento: number;
  sinUbicacion: number;
  ciudadesAlcanzadas: number;
  departamentos: DepartamentoMapa[];
  ciudades: CiudadMapa[];
}

/** Pedidos del comercio por ciudad y departamento, para el mapa de calor de la bienvenida. */
@Injectable({ providedIn: 'root' })
export class MapaPedidosService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getMapaPedidos(dias = 90): Observable<MapaPedidosResponse> {
    return this.get<MapaPedidosResponse>(`/v1/analytics/logistica/mapa-pedidos?dias=${dias}`);
  }
}
